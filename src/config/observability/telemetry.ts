import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

let sdk: NodeSDK | null = null;
let prometheusExporter: PrometheusExporter | null = null;

interface TelemetryConfig {
  otlpEndpoint: string;
  serviceName?: string;
}

export function initTelemetry({ otlpEndpoint, serviceName = "discovery-engine" }: TelemetryConfig): void {
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  prometheusExporter = new PrometheusExporter({
    preventServerStart: true,
  });

  sdk = new NodeSDK({
    serviceName,
    traceExporter,
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-runtime-node": { enabled: false },
      }),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}

export function getPrometheusExporter(): PrometheusExporter | null {
  return prometheusExporter;
}

export function isTelemetryInitialized(): boolean {
  return sdk !== null;
}
