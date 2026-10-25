-- Bombillo · esquema inicial (PostgreSQL 16 + PostGIS 3)
-- Se aplica con: pnpm --filter @bombillo/api db:migrate

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE ede AS ENUM ('edenorte', 'edesur', 'edeeste');
  CREATE TYPE provenance AS ENUM ('official', 'press', 'simulated');
  CREATE TYPE circuit_class AS ENUM ('A', 'B', 'C', 'D');
  CREATE TYPE report_status AS ENUM ('off', 'on');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS provinces (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  ede   text NOT NULL,
  geom  geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS provinces_geom_gist ON provinces USING gist (geom);

CREATE TABLE IF NOT EXISTS circuits (
  code                  text PRIMARY KEY,
  ede                   ede NOT NULL,
  name                  text NOT NULL,
  province_id           text NOT NULL REFERENCES provinces(id),
  municipality          text NOT NULL,
  location              geometry(Point, 4326) NOT NULL,
  location_approximate  boolean NOT NULL DEFAULT true,
  clients               integer NOT NULL CHECK (clients > 0),
  class                 circuit_class NOT NULL,
  zones                 text[] NOT NULL DEFAULT '{}',
  provenance            provenance NOT NULL,
  source                jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS circuits_province_idx ON circuits (province_id);
CREATE INDEX IF NOT EXISTS circuits_location_gist ON circuits USING gist (location);

-- Documentos crudos: se guarda el original antes de parsear (reprocesable).
CREATE TABLE IF NOT EXISTS raw_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ede           ede NOT NULL,
  url           text NOT NULL,
  sha256        text NOT NULL UNIQUE,
  content_type  text NOT NULL,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  storage_path  text NOT NULL
);

CREATE TABLE IF NOT EXISTS planned_outages (
  id                text PRIMARY KEY,
  circuit_code      text NOT NULL REFERENCES circuits(code),
  ede               ede NOT NULL,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL CHECK (ends_at > starts_at),
  cause             text NOT NULL,
  clients_affected  integer,
  zones             text[] NOT NULL DEFAULT '{}',
  provenance        provenance NOT NULL,
  source            jsonb NOT NULL,
  note              text,
  raw_document_id   uuid REFERENCES raw_documents(id)
);
CREATE INDEX IF NOT EXISTS planned_outages_range_idx ON planned_outages (starts_at, ends_at);

-- Reportes ciudadanos. En producción: particionar por mes (received_at).
CREATE TABLE IF NOT EXISTS citizen_reports (
  id            uuid PRIMARY KEY,
  circuit_code  text REFERENCES circuits(code),
  location      geometry(Point, 4326) NOT NULL,
  status        report_status NOT NULL,
  device_hash   text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_device_time_idx ON citizen_reports (device_hash, received_at);
CREATE INDEX IF NOT EXISTS reports_circuit_time_idx ON citizen_reports (circuit_code, received_at);
CREATE INDEX IF NOT EXISTS reports_location_gist ON citizen_reports USING gist (location);
