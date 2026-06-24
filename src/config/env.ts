import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform(Number)
    .pipe(z.number().int().positive()),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url(),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("Invalid environment variables:", formatted);
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export const env = loadEnv();
