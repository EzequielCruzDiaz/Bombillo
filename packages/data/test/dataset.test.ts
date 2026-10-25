import { describe, expect, it } from "vitest";
import { buildTimeline, getSnapshot } from "@bombillo/domain";
import { dataset, provinces } from "../src";

describe("semilla generada", () => {
  it("cubre las 32 provincias con al menos un circuito", () => {
    expect(dataset.provinces).toHaveLength(32);
    for (const p of dataset.provinces) {
      expect(
        dataset.circuits.some((c) => c.provinceId === p.id),
        p.id,
      ).toBe(true);
    }
  });

  it("todos los cortes apuntan a circuitos existentes", () => {
    const codes = new Set(dataset.circuits.map((c) => c.code));
    for (const o of dataset.plannedOutages) expect(codes.has(o.circuitCode), o.id).toBe(true);
  });

  it("los circuitos sintéticos están marcados como simulados", () => {
    for (const c of dataset.circuits.filter((c) => c.code.startsWith("SIM-"))) {
      expect(c.provenance).toBe("simulated");
    }
  });

  it("conserva los 121 cortes oficiales de Edenorte", () => {
    expect(dataset.plannedOutages.filter((o) => o.ede === "edenorte")).toHaveLength(121);
  });

  it("el GeoJSON de provincias coincide con el catálogo", () => {
    const ids = new Set(dataset.provinces.map((p) => p.id));
    expect(provinces.features.every((f) => ids.has(f.properties.id))).toBe(true);
  });

  it("cada escenario produce una línea de tiempo con cortes", () => {
    for (const s of dataset.scenarios) {
      const tl = buildTimeline(s, dataset);
      expect(tl.intervals.length, s.id).toBeGreaterThan(10);
      const mid = getSnapshot(tl, dataset, (tl.start + tl.end) / 2);
      expect(mid.totals.clients).toBeGreaterThan(0);
    }
  });
});
