import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "packages/ui/node_modules/maplibre-gl/dist");

for (const app of ["apps/web", "apps/presentation"]) {
  const out = resolve(root, app, "public/maplibre");
  mkdirSync(out, { recursive: true });
  for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    cpSync(resolve(dist, f), resolve(out, f));
  }
}
console.info("maplibre worker copiado a apps/web y apps/presentation");
