import { dataset as seed } from "@bombillo/data";
import type { Circuit, Dataset, Ede, PlannedOutage, Province, SourceRef } from "@bombillo/domain";
import { and, eq, gt, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../db/schema";
import type { CitizenReport, CircuitFilter, OutageRepository, Page } from "./types";

const lng = sql<number>`ST_X(${s.circuits.location})`;
const lat = sql<number>`ST_Y(${s.circuits.location})`;

/** Implementación de producción sobre PostgreSQL + PostGIS. */
export class PostgresRepository implements OutageRepository {
  private constructor(private readonly db: PostgresJsDatabase<typeof s>) {}

  static async connect(url: string) {
    const client = postgres(url, { max: 10 });
    return new PostgresRepository(drizzle(client, { schema: s }));
  }

  async listProvinces(): Promise<Province[]> {
    const rows = await this.db
      .select({
        id: s.provinces.id,
        name: s.provinces.name,
        ede: s.provinces.ede,
        x: sql<number>`ST_X(ST_PointOnSurface(${s.provinces.geom}))`,
        y: sql<number>`ST_Y(ST_PointOnSurface(${s.provinces.geom}))`,
      })
      .from(s.provinces);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      ede: r.ede as Province["ede"],
      center: [r.x, r.y],
    }));
  }

  async listCircuits(filter: CircuitFilter): Promise<Page<Circuit>> {
    const where: SQL[] = [];
    if (filter.provinceId) where.push(eq(s.circuits.provinceId, filter.provinceId));
    if (filter.ede) where.push(eq(s.circuits.ede, filter.ede));
    if (filter.cursor) where.push(gt(s.circuits.code, filter.cursor));
    if (filter.q) {
      where.push(
        or(
          ilike(s.circuits.code, `%${filter.q}%`),
          ilike(s.circuits.municipality, `%${filter.q}%`),
        )!,
      );
    }
    const rows = await this.db
      .select({ c: s.circuits, lng, lat })
      .from(s.circuits)
      .where(where.length ? and(...where) : undefined)
      .orderBy(s.circuits.code)
      .limit(filter.limit + 1);
    const items = rows.slice(0, filter.limit).map(toCircuit);
    return { items, nextCursor: rows.length > filter.limit ? (items.at(-1)?.code ?? null) : null };
  }

  async getCircuit(code: string) {
    const [row] = await this.db
      .select({ c: s.circuits, lng, lat })
      .from(s.circuits)
      .where(eq(s.circuits.code, code));
    return row ? toCircuit(row) : null;
  }

  async listPlannedOutages(range: {
    from: string;
    to: string;
    ede?: Ede;
  }): Promise<PlannedOutage[]> {
    const rows = await this.db
      .select()
      .from(s.plannedOutages)
      .where(
        and(
          gt(s.plannedOutages.endsAt, new Date(range.from)),
          lt(s.plannedOutages.startsAt, new Date(range.to)),
          range.ede ? eq(s.plannedOutages.ede, range.ede) : undefined,
        ),
      )
      .orderBy(s.plannedOutages.startsAt);
    return rows.map((o) => ({
      id: o.id,
      circuitCode: o.circuitCode,
      ede: o.ede,
      start: o.startsAt.toISOString(),
      end: o.endsAt.toISOString(),
      cause: o.cause,
      clientsAffected: o.clientsAffected,
      zones: o.zones,
      provenance: o.provenance,
      source: o.source as SourceRef,
      ...(o.note ? { note: o.note } : {}),
    }));
  }

  // Los escenarios son configuración versionada en el repo, no datos de usuario.
  async listScenarios() {
    return seed.scenarios;
  }

  async getScenario(id: string) {
    return seed.scenarios.find((sc) => sc.id === id) ?? null;
  }

  async loadDataset(): Promise<Dataset> {
    const [provinces, circuits, plannedOutages] = await Promise.all([
      this.listProvinces(),
      this.listCircuits({ limit: 10_000 }).then((p) => p.items),
      this.listPlannedOutages({ from: "2000-01-01T00:00:00Z", to: "2100-01-01T00:00:00Z" }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      provinces,
      circuits,
      plannedOutages,
      scenarios: seed.scenarios,
    };
  }

  async saveReport(r: CitizenReport) {
    await this.db.insert(s.citizenReports).values({
      id: r.id,
      circuitCode: r.circuitCode,
      location: `SRID=4326;POINT(${r.location[0]} ${r.location[1]})`,
      status: r.status,
      deviceHash: r.deviceHash,
      receivedAt: new Date(r.receivedAt),
    });
  }

  async countRecentReports(deviceHash: string, sinceIso: string) {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.citizenReports)
      .where(
        and(
          eq(s.citizenReports.deviceHash, deviceHash),
          gte(s.citizenReports.receivedAt, new Date(sinceIso)),
        ),
      );
    return row?.n ?? 0;
  }
}

function toCircuit({
  c,
  lng,
  lat,
}: {
  c: typeof s.circuits.$inferSelect;
  lng: number;
  lat: number;
}): Circuit {
  return {
    code: c.code,
    ede: c.ede,
    name: c.name,
    provinceId: c.provinceId,
    municipality: c.municipality,
    location: [lng, lat],
    locationApproximate: c.locationApproximate,
    clients: c.clients,
    class: c.class,
    zones: c.zones,
    provenance: c.provenance,
    source: c.source as SourceRef,
  };
}
