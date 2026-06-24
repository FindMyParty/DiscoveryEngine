import amqplib from "amqplib";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logger.js";
import type { IEventPublisher } from "../../../domain/ports/outbound/event-publisher.port.js";

const EXCHANGE_DISCOVERY = "discovery.events";

export type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

export async function createAmqpPublisher(): Promise<{
  publisher: IEventPublisher;
  connection: AmqpConnection;
  checkRabbitMQ(): Promise<"ok">;
  close(): Promise<void>;
}> {
  const connection = await amqplib.connect(env.RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE_DISCOVERY, "topic", { durable: true });
  logger.info({ exchange: EXCHANGE_DISCOVERY }, "RabbitMQ exchange asserted");

  const publisher: IEventPublisher = {
    async publish(routingKey: string, payload: object): Promise<void> {
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

  async function checkRabbitMQ(): Promise<"ok"> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(connection as any).connection?.serverProperties) {
      throw new Error("RabbitMQ disconnected");
    }
    return "ok";
  }

  async function close(): Promise<void> {
    await channel.close();
    await connection.close();
  }

  return { publisher, connection, checkRabbitMQ, close };
}
