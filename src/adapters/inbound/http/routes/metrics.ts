import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { getPrometheusExporter } from "../../../../config/observability/telemetry.js";

const metricsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/metrics",
    {
      schema: {
        tags: ["Observability"],
        summary: "Prometheus metrics",
        description: "Returns metrics in Prometheus format for scraping.",
        response: {
          200: { type: "string", description: "Metrics in text/plain format" },
          503: { $ref: "Error#" },
        },
      },
    },
    async (request, reply) => {
      const exporter = getPrometheusExporter();

      if (!exporter) {
        return reply.status(503).send({
          error: { code: "METRICS_UNAVAILABLE", message: "Metrics not initialized" },
        });
      }

      reply.hijack();
      exporter.getMetricsRequestHandler(request.raw, reply.raw);
    },
  );
};

export default metricsRoutes;
