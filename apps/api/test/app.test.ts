import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataset } from "@bombillo/data";
import type { Snapshot } from "@bombillo/domain";
import { buildApp } from "../src/app";
import { loadConfig } from "../src/config";
import { MemoryRepository } from "../src/repositories/memory";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({
    config: loadConfig({ NODE_ENV: "test" }),
    repo: new MemoryRepository(dataset),
  });
});
afterAll(() => app.close());

describe("API v1", () => {
  it("GET /health", async () => {
    const res = await app.inject("/health");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", dataSource: "memory" });
  });

  it("lista provincias", async () => {
    const res = await app.inject("/v1/provinces");
    expect(res.json().items).toHaveLength(32);
  });

  it("pagina circuitos por cursor", async () => {
    const first = (await app.inject("/v1/circuits?limit=10")).json();
    expect(first.items).toHaveLength(10);
    expect(first.nextCursor).toBe(first.items[9].code);
    const second = (await app.inject(`/v1/circuits?limit=10&cursor=${first.nextCursor}`)).json();
    expect(second.items[0].code > first.nextCursor).toBe(true);
  });

  it("filtra circuitos por provincia y búsqueda", async () => {
    const res = (await app.inject("/v1/circuits?provinceId=santiago&q=tamboril")).json();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((c: { provinceId: string }) => c.provinceId === "santiago")).toBe(true);
  });

  it("devuelve 404 con formato uniforme", async () => {
    const res = await app.inject("/v1/circuits/NOEXISTE");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ type: "not_found", status: 404 });
  });

  it("valida parámetros con Zod (400)", async () => {
    const res = await app.inject("/v1/planned-outages?from=ayer");
    expect(res.statusCode).toBe(400);
    expect(res.json().type).toBe("validation_error");
  });

  it("lista cortes programados de un rango", async () => {
    const res = await app.inject(
      "/v1/planned-outages?from=2026-10-19T00:00:00-04:00&to=2026-10-20T00:00:00-04:00&ede=edenorte",
    );
    expect(res.json().items.length).toBeGreaterThan(10);
  });

  it("no expone la semilla interna de los escenarios", async () => {
    const res = (await app.inject("/v1/scenarios")).json();
    expect(res.items).toHaveLength(4);
    expect(res.items[0].seed).toBeUndefined();
  });

  it("calcula la fotografía del apagón general", async () => {
    const res = await app.inject(
      "/v1/scenarios/apagon-general-11-nov-2025/snapshot?at=2025-11-11T14:00:00-04:00",
    );
    const snap = res.json() as Snapshot;
    expect(snap.totals.circuitsOff).toBe(dataset.circuits.length);
    expect(snap.alerts[0]).toBeDefined();
  });

  it("acepta un reporte ciudadano y limita por dispositivo", async () => {
    const deviceId = randomUUID();
    const body = { location: [-69.93, 18.48], status: "off", deviceId };
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({ method: "POST", url: "/v1/reports", payload: body });
      expect(ok.statusCode).toBe(202);
    }
    const blocked = await app.inject({ method: "POST", url: "/v1/reports", payload: body });
    expect(blocked.statusCode).toBe(429);
  });

  it("rechaza reportes fuera de República Dominicana", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/reports",
      payload: { location: [-66.1, 18.4], status: "off", deviceId: randomUUID() },
    });
    expect(res.statusCode).toBe(400);
  });
});
