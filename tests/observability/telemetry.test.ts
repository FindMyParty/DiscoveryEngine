import { describe, it, expect, afterAll } from "vitest";
import {
  initTelemetry,
  shutdownTelemetry,
  getPrometheusExporter,
  isTelemetryInitialized,
} from "../../src/config/observability/telemetry.js";

describe("Telemetry", () => {
  afterAll(async () => {
    await shutdownTelemetry();
  });

  it("reports not initialized before init is called", () => {
    expect(isTelemetryInitialized()).toBe(false);
    expect(getPrometheusExporter()).toBeNull();
  });

  it("initializes OTel SDK with trace and metrics exporters", () => {
    initTelemetry({ otlpEndpoint: "http://localhost:4318" });

    expect(isTelemetryInitialized()).toBe(true);
    expect(getPrometheusExporter()).not.toBeNull();
  });

  it("provides a Prometheus exporter with a metrics request handler", () => {
    const exporter = getPrometheusExporter();

    expect(typeof exporter!.getMetricsRequestHandler).toBe("function");
  });
});
