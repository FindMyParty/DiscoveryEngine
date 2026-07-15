import amqplib from "amqplib";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logger.js";
import type { IEventPublisher } from "../../../domain/ports/outbound/event-publisher.port.js";

const EXCHANGE_DISCOVERY = "discovery.events";

export type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

export async function createAmqpPublisher(options?: {
  onClose?: (err?: Error) => void;
}): Promise<{
  publisher: IEventPublisher;
  connection: AmqpConnection;
  close(): Promise<void>;
}> {
  const connection = await amqplib.connect(env.RABBITMQ_URL);

  connection.on("close", (err?: Error) => {
    logger.warn({ err }, "RabbitMQ connection closed");
    options?.onClose?.(err);
  });

  connection.on("error", (err: Error) => {
    logger.error({ err }, "RabbitMQ connection error");
  });

  const channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE_DISCOVERY, "topic", { durable: true });
  logger.info({ exchange: EXCHANGE_DISCOVERY }, "RabbitMQ exchange asserted");

  const publisher: IEventPublisher = {
    async publish(routingKey: string, payload: object): Promise<void> {
      logger.debug({ routingKey }, "Publishing event");
      return new Promise((resolve, reject) => {
        const sent = channel.publish(
          EXCHANGE_DISCOVERY,
          routingKey,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true },
          (err) => (err ? reject(err) : resolve()),
        );
        if (!sent) {
          reject(new Error("RabbitMQ channel buffer full"));
        }
      });
    },
  };

  async function close(): Promise<void> {
    try {
      await channel.close();
    } catch {
      // already closed
    }
    try {
      await connection.close();
    } catch {
      // already closed
    }
  }

  return { publisher, connection, close };
}
