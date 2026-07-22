import { metrics } from "@opentelemetry/api";
import type { IDiscoveryMetrics } from "../../../domain/use-cases/discovery.use-case.js";

export class OtelDiscoveryMetrics implements IDiscoveryMetrics {
  readonly #discoveriesTriggeredCounter;

  constructor() {
    const meter = metrics.getMeter("discovery-engine");

    this.#discoveriesTriggeredCounter = meter.createCounter(
      "discovery_engine_discoveries_triggered_total",
      { description: "Total number of discovery processes triggered" },
    );
  }

  recordDiscoveryTriggered(): void {
    this.#discoveriesTriggeredCounter.add(1);
  }
}
