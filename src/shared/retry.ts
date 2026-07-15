import { logger } from "./logger.js";

interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  factor: number;
  label: string;
}

const MAX_DELAY_MS = 30_000;

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts, initialDelayMs, factor, label }: RetryOptions,
): Promise<T> {
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        logger.error({ error, label, attempt }, "All retry attempts exhausted");
        throw error;
      }
      logger.warn({ label, attempt, nextRetryMs: delayMs }, "Connection attempt failed, retrying");
      await sleep(delayMs);
      delayMs = Math.min(delayMs * factor, MAX_DELAY_MS);
    }
  }

  throw new Error("Unexpected end of retry loop");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
