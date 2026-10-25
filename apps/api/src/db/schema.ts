import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Esquema de producción (PostgreSQL 16 + PostGIS). Espeja migrations/0001_init.sql.
 * La demo no lo necesita: corre con MemoryRepository.
 */

/** geometry(Point, 4326) de PostGIS. Se lee/escribe como WKT/EWKT. */
const point = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(Point, 4326)",
});
const multiPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(MultiPolygon, 4326)",
});

export const edeEnum = pgEnum("ede", ["edenorte", "edesur", "edeeste"]);
export const provenanceEnum = pgEnum("provenance", ["official", "press", "simulated"]);
export const circuitClassEnum = pgEnum("circuit_class", ["A", "B", "C", "D"]);
export const reportStatusEnum = pgEnum("report_status", ["off", "on"]);

export const provinces = pgTable("provinces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ede: text("ede").notNull(),
  geom: multiPolygon("geom").notNull(),
});

export const circuits = pgTable(
  "circuits",
  {
    code: text("code").primaryKey(),
    ede: edeEnum("ede").notNull(),
    name: text("name").notNull(),
    provinceId: text("province_id")
      .notNull()
      .references(() => provinces.id),
    municipality: text("municipality").notNull(),
    location: point("location").notNull(),
    locationApproximate: boolean("location_approximate").notNull().default(true),
    clients: integer("clients").notNull(),
    class: circuitClassEnum("class").notNull(),
    zones: text("zones")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    provenance: provenanceEnum("provenance").notNull(),
    source: jsonb("source").notNull(),
  },
  (t) => [
    index("circuits_province_idx").on(t.provinceId),
    index("circuits_location_gist").using("gist", t.location),
  ],
);

export const plannedOutages = pgTable(
  "planned_outages",
  {
    id: text("id").primaryKey(),
    circuitCode: text("circuit_code")
      .notNull()
      .references(() => circuits.code),
    ede: edeEnum("ede").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    cause: text("cause").notNull(),
    clientsAffected: integer("clients_affected"),
    zones: text("zones")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    provenance: provenanceEnum("provenance").notNull(),
    source: jsonb("source").notNull(),
    note: text("note"),
    /** Huella del archivo de origen: permite reprocesar sin duplicar (idempotencia). */
    rawDocumentId: uuid("raw_document_id"),
  },
  (t) => [index("planned_outages_range_idx").on(t.startsAt, t.endsAt)],
);

/** Documentos crudos (HTML, Excel, PDF) tal como se descargaron. */
export const rawDocuments = pgTable("raw_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ede: edeEnum("ede").notNull(),
  url: text("url").notNull(),
  sha256: text("sha256").notNull().unique(),
  contentType: text("content_type").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  storagePath: text("storage_path").notNull(),
});

export const citizenReports = pgTable(
  "citizen_reports",
  {
    id: uuid("id").primaryKey(),
    circuitCode: text("circuit_code").references(() => circuits.code),
    location: point("location").notNull(),
    status: reportStatusEnum("status").notNull(),
    deviceHash: text("device_hash").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_device_time_idx").on(t.deviceHash, t.receivedAt),
    index("reports_circuit_time_idx").on(t.circuitCode, t.receivedAt),
    index("reports_location_gist").using("gist", t.location),
  ],
);
