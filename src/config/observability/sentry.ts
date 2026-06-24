import * as Sentry from "@sentry/node";

let initialized = false;

interface SentryConfig {
  dsn?: string;
  environment?: string;
}

export function initSentry({ dsn, environment = "development" }: SentryConfig): void {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 1.0,
  });

  initialized = true;
}

export function isSentryInitialized(): boolean {
  return initialized;
}
