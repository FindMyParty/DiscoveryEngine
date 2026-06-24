import { describe, it, expect } from "vitest";
import { initSentry, isSentryInitialized } from "../../src/config/observability/sentry.js";

describe("Sentry", () => {
  it("does not initialize when dsn is not provided", () => {
    initSentry({});
    expect(isSentryInitialized()).toBe(false);
  });

  it("does not initialize when dsn is empty string", () => {
    initSentry({ dsn: "" });
    expect(isSentryInitialized()).toBe(false);
  });
});
