import { z } from "zod";

/**
 * Configuración validada al arrancar. Si falta una variable o tiene un valor
 * inválido, el proceso falla de inmediato con un mensaje claro (fail fast).
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    /** memory = semilla en memoria (demo). postgres = PostGIS vía Drizzle. */
    DATA_SOURCE: z.enum(["memory", "postgres"]).default("memory"),
    DATABASE_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  })
  .refine((env) => env.DATA_SOURCE !== "postgres" || !!env.DATABASE_URL, {
    message: "DATABASE_URL es obligatorio cuando DATA_SOURCE=postgres",
    path: ["DATABASE_URL"],
  });

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuración inválida:\n${issues.join("\n")}`);
  }
  return parsed.data;
}
