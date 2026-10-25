import { dataset } from "@bombillo/data";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { MemoryRepository } from "./repositories/memory";
import type { OutageRepository } from "./repositories/types";

async function createRepository(config: ReturnType<typeof loadConfig>): Promise<OutageRepository> {
  if (config.DATA_SOURCE === "postgres") {
    const { PostgresRepository } = await import("./repositories/postgres");
    return PostgresRepository.connect(config.DATABASE_URL!);
  }
  return new MemoryRepository(dataset);
}

async function main() {
  const config = loadConfig();
  const app = await buildApp({ config, repo: await createRepository(config) });

  // Cierre ordenado: termina las peticiones en curso antes de salir.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, "cerrando servidor");
      await app.close();
      process.exit(0);
    });
  }

  await app.listen({ host: config.HOST, port: config.PORT });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
