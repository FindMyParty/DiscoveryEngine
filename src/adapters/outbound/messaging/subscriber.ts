import amqplib from "amqplib";
import { z } from "zod";
import { logger } from "../../../shared/logger.js";
import { Experience } from "../../../domain/entities/profile.js";
import type { DiscoveryService } from "../../../application/services/discovery.service.js";
import type { AmqpConnection } from "./publisher.js";

const EXCHANGE_PROFILE = "profile.events";
const EXCHANGE_MATCH = "match.events";
const EXCHANGE_DISCOVERY = "discovery.events";
const EXCHANGE_DLX = "discovery.dlx";

const QUEUE_PROFILE_UPDATED = "discovery-engine.profile.updated";
const QUEUE_MATCH_CREATED = "discovery-engine.match.created";
const QUEUE_DISCOVERY_TRIGGERED = "discovery-engine.discovery.triggered";

const ROUTING_KEY_PROFILE_UPDATED = "profile.profile.updated";
const ROUTING_KEY_MATCH_CREATED = "match.match.created";
const ROUTING_KEY_DISCOVERY_TRIGGERED = "discovery.discovery.triggered";

const profileUpdatedSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
  isDM: z.boolean(),
  isPlayer: z.boolean(),
  isRemote: z.boolean(),
  experience: z.nativeEnum(Experience),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

const profilesMatchedSchema = z.object({
  profileId1: z.string().uuid(),
  profileId2: z.string().uuid(),
});

const discoveryTriggeredSchema = z.object({
  profileId: z.string().uuid(),
});

const deadLetterArgs = {
  "x-dead-letter-exchange": EXCHANGE_DLX,
};

export async function registerSubscribers(
  connection: AmqpConnection,
  discoveryService: DiscoveryService,
): Promise<void> {
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_DLX, "topic", { durable: true });
  await channel.assertExchange(EXCHANGE_PROFILE, "topic", { durable: true });
  await channel.assertExchange(EXCHANGE_MATCH, "topic", { durable: true });
  await channel.assertExchange(EXCHANGE_DISCOVERY, "topic", { durable: true });

  await channel.assertQueue(QUEUE_PROFILE_UPDATED, { durable: true, arguments: deadLetterArgs });
  await channel.assertQueue(QUEUE_MATCH_CREATED, { durable: true, arguments: deadLetterArgs });
  await channel.assertQueue(QUEUE_DISCOVERY_TRIGGERED, { durable: true, arguments: deadLetterArgs });

  await channel.bindQueue(QUEUE_PROFILE_UPDATED, EXCHANGE_PROFILE, ROUTING_KEY_PROFILE_UPDATED);
  await channel.bindQueue(QUEUE_MATCH_CREATED, EXCHANGE_MATCH, ROUTING_KEY_MATCH_CREATED);
  await channel.bindQueue(QUEUE_DISCOVERY_TRIGGERED, EXCHANGE_DISCOVERY, ROUTING_KEY_DISCOVERY_TRIGGERED);

  await channel.consume(QUEUE_PROFILE_UPDATED, async (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    logger.debug({ queue: QUEUE_PROFILE_UPDATED }, "Message received");
    try {
      const payload = profileUpdatedSchema.parse(JSON.parse(msg.content.toString()));
      await discoveryService.handleProfileUpdated(payload);
      channel.ack(msg);
      logger.debug({ queue: QUEUE_PROFILE_UPDATED, profileId: payload.id }, "Message processed");
    } catch (error) {
      logger.error({ error, queue: QUEUE_PROFILE_UPDATED }, "Failed to process message");
      channel.nack(msg, false, false);
    }
  });

  await channel.consume(QUEUE_MATCH_CREATED, async (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    logger.debug({ queue: QUEUE_MATCH_CREATED }, "Message received");
    try {
      const payload = profilesMatchedSchema.parse(JSON.parse(msg.content.toString()));
      await discoveryService.handleProfilesMatched(payload.profileId1, payload.profileId2);
      channel.ack(msg);
      logger.debug({ queue: QUEUE_MATCH_CREATED, profileId1: payload.profileId1, profileId2: payload.profileId2 }, "Message processed");
    } catch (error) {
      logger.error({ error, queue: QUEUE_MATCH_CREATED }, "Failed to process message");
      channel.nack(msg, false, false);
    }
  });

  await channel.consume(QUEUE_DISCOVERY_TRIGGERED, async (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    logger.debug({ queue: QUEUE_DISCOVERY_TRIGGERED }, "Message received");
    try {
      const payload = discoveryTriggeredSchema.parse(JSON.parse(msg.content.toString()));
      await discoveryService.triggerDiscovery(payload.profileId);
      channel.ack(msg);
      logger.debug({ queue: QUEUE_DISCOVERY_TRIGGERED, profileId: payload.profileId }, "Message processed");
    } catch (error) {
      logger.error({ error, queue: QUEUE_DISCOVERY_TRIGGERED }, "Failed to process message");
      channel.nack(msg, false, false);
    }
  });

  logger.info("Queue subscribers registered");
}
