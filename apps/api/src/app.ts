import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { Config } from "./config";
import { errorHandler } from "./http/errors";
import type { OutageRepository } from "./repositories/types";
import { v1Routes } from "./routes/v1";
import { ScenarioService } from "./services/scenario-service";

export type AppDeps = { config: Config; repo: OutageRepository };

/**
 * Fábrica de la app: recibe sus dependencias en lugar de crearlas.
 * Así los tests inyectan un repositorio en memoria y no abren puertos.
 */
export async function buildApp({ config, repo }: AppDeps, opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ["req.headers.authorization", "req.body.deviceId"],
            ...(config.NODE_ENV === "development"
              ? { transport: { target: "pino-pretty", options: { singleLine: true } } }
              : {}),
          },
    ...opts,
  });

  await app.register(helmet);
  await app.register(cors, { origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) });
  await app.register(rateLimit, { max: config.RATE_LIMIT_PER_MINUTE, timeWindow: "1 minute" });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((req, reply) =>
    reply
      .status(404)
      .send({ type: "not_found", title: `Ruta ${req.method} ${req.url} no existe`, status: 404 }),
  );

  app.get("/health", async () => ({ status: "ok", dataSource: config.DATA_SOURCE }));

  const scenarios = new ScenarioService(repo);
  await app.register(v1Routes, { prefix: "/v1", repo, scenarios });

  return app;
}
