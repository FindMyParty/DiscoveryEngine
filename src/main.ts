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

async function main(): Promise<void> {
  // 3. Connect database and run pending migrations
  await checkPostgres();
  await runMigrations();
  const profileRepository = new PostgresProfileRepository();
  const suggestionRepository = new PostgresSuggestionRepository();
  logger.info("Database connected (PostgreSQL)");

  // 4. Connect RabbitMQ
  const { publisher, connection, checkRabbitMQ, close: closePublisher } =
    await createAmqpPublisher();
  logger.info("RabbitMQ connected");

  // Wire dependencies
  const discoveryMetrics = new OtelDiscoveryMetrics();
  const discoveryUseCase = new DiscoveryUseCase({
    profileRepository,
    suggestionRepository,
    eventPublisher: publisher,
    metrics: discoveryMetrics,
  });
  const discoveryService = new DiscoveryService(discoveryUseCase);

  // 5. Register queue subscribers
  await registerSubscribers(connection, discoveryService);

  // 6. Start HTTP server
  const server = await buildServer({
    dependencyCheckers: {
      postgres: checkPostgres,
      rabbitmq: checkRabbitMQ,
      otel: async () => "ok",
    },
  });

  await server.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Server listening on port ${env.PORT}`);

  // 7. Handle SIGTERM and SIGINT — graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");

    try {
      await server.close();
      logger.info("HTTP server closed");
    } catch (error) {
      logger.error(error, "Error closing HTTP server");
    }

    try {
      await closePublisher();
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

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error(error, "Failed to start service");
  process.exit(1);
});
