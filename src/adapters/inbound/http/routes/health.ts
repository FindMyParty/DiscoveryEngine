import type { FastifyInstance, FastifyPluginAsync } from "fastify";

interface HealthPluginOptions {
  dependencyCheckers?: Record<string, () => Promise<string>>;
}

const healthRoutes: FastifyPluginAsync<HealthPluginOptions> = async (
  fastify: FastifyInstance,
  options: HealthPluginOptions,
) => {
  const checkers = options.dependencyCheckers ?? {};

  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Observability"],
        summary: "Health check",
        description: "Returns the health status of the service and its dependencies.",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok", "degraded"] },
              dependencies: { type: "object", additionalProperties: { type: "string" } },
            },
          },
          503: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["degraded"] },
              dependencies: { type: "object", additionalProperties: { type: "string" } },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const dependencies: Record<string, string> = {};
      let allHealthy = true;

      const entries = Object.entries(checkers);

      const results = await Promise.allSettled(
        entries.map(async ([name, check]) => {
          const status = await check();
          return { name, status };
        }),
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          dependencies[result.value.name] = result.value.status;
          if (result.value.status !== "ok") {
            allHealthy = false;
          }
        } else {
          dependencies[entries[index][0]] = "error";
          allHealthy = false;
        }
      });

      const statusCode = allHealthy ? 200 : 503;

      return reply.status(statusCode).send({
        status: allHealthy ? "ok" : "degraded",
        dependencies,
      });
    },
  );
};

export default healthRoutes;
