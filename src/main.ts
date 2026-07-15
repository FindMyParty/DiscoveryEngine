// 1. Initialize OpenTelemetry SDK (must be first — patches modules at startup)
import { initTelemetry, shutdownTelemetry } from "./config/observability/telemetry.js";
import { initSentry } from "./config/observability/sentry.js";

// 2. Validate env vars (env is validated on import)
import { env } from "./config/env.js";

initTelemetry({
  otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  serviceName: "discovery-engine",
});

initSentry({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
});

import { logger } from "./shared/logger.js";
import { withRetry } from "./shared/retry.js";
import { buildServer } from "./adapters/inbound/http/server.js";
import { checkPostgres, closeDatabase } from "./adapters/outbound/db/client.js";
import { runMigrations } from "./adapters/outbound/db/migrator.js";
import { PostgresProfileRepository } from "./adapters/outbound/db/profile.repository.js";
import { PostgresSuggestionRepository } from "./adapters/outbound/db/suggestion.repository.js";
import { createAmqpPublisher } from "./adapters/outbound/messaging/publisher.js";
import { registerSubscribers } from "./adapters/outbound/messaging/subscriber.js";
import { OtelDiscoveryMetrics } from "./adapters/outbound/metrics/otel-discovery-metrics.js";
import { DiscoveryUseCase } from "./domain/use-cases/discovery.use-case.js";
import { DiscoveryService } from "./application/services/discovery.service.js";
import type { IEventPublisher } from "./domain/ports/outbound/event-publisher.port.js";

const STARTUP_RETRY = {
  maxAttempts: 10,
  initialDelayMs: 1_000,
  factor: 2,
} as const;

class MutablePublisher implements IEventPublisher {
  #delegate: IEventPublisher;

  constructor(initial: IEventPublisher) {
    this.#delegate = initial;
  }

  replace(publisher: IEventPublisher): void {
    this.#delegate = publisher;
  }

  async publish(routingKey: string, payload: object): Promise<void> {
    return this.#delegate.publish(routingKey, payload);
  }
}

async function main(): Promise<void> {
  // Mutable state managed by the RabbitMQ reconnection loop
  let rabbitMQConnected = false;
  let isReconnecting = false;
  let isShuttingDown = false;
  let closeCurrentRabbitMQ: (() => Promise<void>) | undefined;

  // Assigned before the connection can drop; assertion is intentional.
  let mutablePublisher!: MutablePublisher;
  let discoveryService!: DiscoveryService;

  function scheduleRabbitMQReconnect(): void {
    if (isShuttingDown || isReconnecting) return;
    isReconnecting = true;
    setTimeout(() => {
      void reconnectRabbitMQ();
    }, 1_000);
  }

  async function reconnectRabbitMQ(): Promise<void> {
    rabbitMQConnected = false;
    logger.warn("RabbitMQ disconnected, starting reconnection...");
    try {
      const { publisher, connection, close } = await withRetry(
        () => createAmqpPublisher({ onClose: scheduleRabbitMQReconnect }),
        { ...STARTUP_RETRY, label: "rabbitmq-reconnect" },
      );

      closeCurrentRabbitMQ = close;
      mutablePublisher.replace(publisher);
      await registerSubscribers(connection, discoveryService);
      rabbitMQConnected = true;
      isReconnecting = false;
      logger.info("RabbitMQ reconnected successfully");
    } catch (error) {
      logger.error({ error }, "RabbitMQ reconnection failed after all attempts, will retry");
      isReconnecting = false;
      scheduleRabbitMQReconnect();
    }
  }

  // 3. Connect database and run pending migrations
  await withRetry(checkPostgres, { ...STARTUP_RETRY, label: "postgres" });
  await runMigrations();
  const profileRepository = new PostgresProfileRepository();
  const suggestionRepository = new PostgresSuggestionRepository();
  logger.info("Database connected (PostgreSQL)");

  // 4. Connect RabbitMQ
  const { publisher: initialPublisher, connection: initialConnection, close: initialClose } =
    await withRetry(
      () => createAmqpPublisher({ onClose: scheduleRabbitMQReconnect }),
      { ...STARTUP_RETRY, label: "rabbitmq" },
    );

  rabbitMQConnected = true;
  closeCurrentRabbitMQ = initialClose;
  mutablePublisher = new MutablePublisher(initialPublisher);

  // Wire dependencies
  const discoveryMetrics = new OtelDiscoveryMetrics();
  const discoveryUseCase = new DiscoveryUseCase({
    profileRepository,
    suggestionRepository,
    eventPublisher: mutablePublisher,
    metrics: discoveryMetrics,
  });
  discoveryService = new DiscoveryService(discoveryUseCase);

  // 5. Register queue subscribers
  await registerSubscribers(initialConnection, discoveryService);
  logger.info("RabbitMQ connected");

  // 6. Start HTTP server
  const server = await buildServer({
    dependencyCheckers: {
      postgres: checkPostgres,
      rabbitmq: async () => {
        if (!rabbitMQConnected) throw new Error("RabbitMQ disconnected");
        return "ok";
      },
      otel: async () => "ok",
    },
  });

  await server.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Server listening on port ${env.PORT}`);

  // 7. Handle SIGTERM and SIGINT — graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");
    isShuttingDown = true;

    try {
      await server.close();
      logger.info("HTTP server closed");
    } catch (error) {
      logger.error(error, "Error closing HTTP server");
    }

    try {
      if (closeCurrentRabbitMQ) await closeCurrentRabbitMQ();
      logger.info("RabbitMQ closed");
    } catch (error) {
      logger.error(error, "Error closing RabbitMQ");
    }

    try {
      await closeDatabase();
      logger.info("Database closed");
    } catch (error) {
      logger.error(error, "Error closing database");
    }

    try {
      await shutdownTelemetry();
      logger.info("Telemetry shut down");
    } catch (error) {
      logger.error(error, "Error shutting down telemetry");
    }

    process.exit(0);
  }

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main().catch((error) => {
  logger.error(error, "Failed to start service");
  process.exit(1);
});
