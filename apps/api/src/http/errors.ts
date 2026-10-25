import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' no existe`);
  }
}

export class TooManyReportsError extends Error {
  readonly statusCode = 429;
  constructor() {
    super("Demasiados reportes desde este dispositivo. Intenta de nuevo en unos minutos.");
  }
}

/**
 * Formato de error único (inspirado en RFC 9457 Problem Details):
 * { type, title, status, detail, issues? }. Nunca se filtra el stack al cliente.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      type: "validation_error",
      title: "Solicitud inválida",
      status: 400,
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const status =
    "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  if (status >= 500) request.log.error({ err: error }, "error no controlado");
  return reply.status(status).send({
    type: status === 404 ? "not_found" : status === 429 ? "rate_limited" : "error",
    title: status >= 500 ? "Error interno" : error.message,
    status,
  });
}
