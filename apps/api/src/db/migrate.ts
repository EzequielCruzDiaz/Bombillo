/**
 * Aplica las migraciones SQL en orden y carga la semilla (idempotente).
 *   DATABASE_URL=postgres://... pnpm --filter @bombillo/api db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { dataset, provinces } from "@bombillo/data";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Define DATABASE_URL");
const sql = postgres(url, { max: 1 });
const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`;
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const [done] = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (done) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    console.info(`migración aplicada: ${file}`);
  }

  await sql.begin(async (tx) => {
    for (const f of provinces.features) {
      const p = dataset.provinces.find((x) => x.id === f.properties.id)!;
      await tx`
        INSERT INTO provinces (id, name, ede, geom)
        VALUES (${p.id}, ${p.name}, ${p.ede}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}), 4326)))
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, ede = EXCLUDED.ede, geom = EXCLUDED.geom`;
    }
    for (const c of dataset.circuits) {
      await tx`
        INSERT INTO circuits (code, ede, name, province_id, municipality, location, location_approximate, clients, class, zones, provenance, source)
        VALUES (${c.code}, ${c.ede}, ${c.name}, ${c.provinceId}, ${c.municipality},
                ST_SetSRID(ST_MakePoint(${c.location[0]}, ${c.location[1]}), 4326),
                ${c.locationApproximate}, ${c.clients}, ${c.class}, ${c.zones}, ${c.provenance}, ${tx.json(c.source)})
        ON CONFLICT (code) DO NOTHING`;
    }
    for (const o of dataset.plannedOutages) {
      await tx`
        INSERT INTO planned_outages (id, circuit_code, ede, starts_at, ends_at, cause, clients_affected, zones, provenance, source, note)
        VALUES (${o.id}, ${o.circuitCode}, ${o.ede}, ${o.start}, ${o.end}, ${o.cause}, ${o.clientsAffected},
                ${o.zones}, ${o.provenance}, ${tx.json(o.source)}, ${o.note ?? null})
        ON CONFLICT (id) DO NOTHING`;
    }
  });
  console.info(
    `semilla cargada: ${dataset.circuits.length} circuitos, ${dataset.plannedOutages.length} cortes`,
  );
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
