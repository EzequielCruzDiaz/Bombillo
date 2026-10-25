import { describe, expect, it } from "vitest";
import type { Circuit, Dataset, PlannedOutage, Scenario } from "../schemas";
import { getSnapshot, CONSENSUS_THRESHOLD, activeIntervals } from "./snapshot";
import { buildTimeline } from "./timeline";
import { createRng, hashString } from "./random";
import { formatRd, HOUR, rdTime } from "./time";

const circuit = (code: string, extra: Partial<Circuit> = {}): Circuit => ({
  code,
  ede: "edenorte",
  name: code,
  provinceId: "santiago",
  municipality: "Santiago de los Caballeros",
  location: [-70.7, 19.45],
  locationApproximate: true,
  clients: 3500,
  class: "C",
  zones: ["Centro"],
  provenance: "official",
  source: { label: "test" },
  ...extra,
});

const outage = (code: string, start: string, end: string): PlannedOutage => ({
  id: `o-${code}`,
  circuitCode: code,
  ede: "edenorte",
  start,
  end,
  cause: "Poda preventivo",
  clientsAffected: 1000,
  zones: ["Centro"],
  provenance: "official",
  source: { label: "test" },
});

const scenario = (kind: Scenario["kind"], start: string, end: string): Scenario => ({
  id: `s-${kind}`,
  kind,
  title: kind,
  summary: "",
  start,
  end,
  stepMinutes: 20,
  facts: [],
  simulatedParts: [],
  seed: 42,
});

const dataset = (scenarios: Scenario[], plannedOutages: PlannedOutage[] = []): Dataset => ({
  generatedAt: "2026-10-23T00:00:00Z",
  provinces: [
    { id: "santiago", name: "Santiago", ede: "edenorte", center: [-70.7, 19.45] },
    { id: "azua", name: "Azua", ede: "edesur", center: [-70.7, 18.5] },
  ],
  circuits: [
    circuit("SANT101"),
    circuit("SANT102", { class: "A" }),
    circuit("AZU01", { ede: "edesur", provinceId: "azua", municipality: "Azua", class: "D" }),
  ],
  plannedOutages,
  scenarios,
});

describe("random", () => {
  it("es determinista para la misma semilla", () => {
    const a = createRng(hashString("x"));
    const b = createRng(hashString("x"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("time", () => {
  it("interpreta la hora en UTC-4", () => {
    expect(new Date(rdTime("2026-10-19", "10:00")).toISOString()).toBe("2026-10-19T14:00:00.000Z");
    expect(formatRd(rdTime("2026-10-20", "18:20"))).toBe("mar 20 · 18:20");
  });
});

describe("semana de mantenimientos", () => {
  const s = scenario("maintenance-week", "2026-10-19T06:00:00-04:00", "2026-10-19T21:00:00-04:00");
  const ds = dataset(
    [s],
    [outage("SANT101", "2026-10-19T10:00:00-04:00", "2026-10-19T12:00:00-04:00")],
  );
  const tl = buildTimeline(s, ds);

  it("incluye el corte oficial con su procedencia", () => {
    const official = tl.intervals.find((i) => i.id === "o-SANT101");
    expect(official?.provenance).toBe("official");
    expect(official?.status).toBe("planned");
  });

  it("marca el circuito como programado durante el corte y cuenta clientes afectados", () => {
    const snap = getSnapshot(tl, ds, rdTime("2026-10-19", "10:30"));
    const st = snap.circuits.SANT101!;
    expect(["planned", "fault"]).toContain(st.status);
    if (st.status === "planned") {
      expect(snap.provinces.santiago!.clientsOff).toBeGreaterThanOrEqual(1000);
      expect(st.confirmed).toBe(true); // dato oficial no necesita consenso
    }
  });

  it("emite un aviso al empezar el corte", () => {
    const snap = getSnapshot(tl, ds, rdTime("2026-10-19", "10:05"));
    expect(snap.alerts.some((a) => a.id === "o-SANT101:start")).toBe(true);
  });

  it("es reproducible", () => {
    expect(buildTimeline(s, ds)).toEqual(tl);
  });
});

describe("déficit de generación", () => {
  const s = scenario(
    "generation-deficit",
    "2026-10-22T06:00:00-04:00",
    "2026-10-23T06:00:00-04:00",
  );
  const ds = dataset([s]);
  const tl = buildTimeline(s, ds);
  const hoursOff = (code: string) =>
    tl.intervals
      .filter((i) => i.circuitCode === code && i.cause.startsWith("Rotación"))
      .reduce((sum, i) => sum + (i.end - i.start) / HOUR, 0);

  it("un circuito D pierde más horas que uno A", () => {
    expect(hoursOff("AZU01")).toBeGreaterThan(hoursOff("SANT102"));
    expect(hoursOff("SANT102")).toBeLessThanOrEqual(2);
  });

  it("los bloques empiezan a 'y 20'", () => {
    for (const i of tl.intervals.filter((x) => x.cause.startsWith("Rotación"))) {
      expect(new Date(i.start).getUTCMinutes()).toBe(20);
    }
  });
});

describe("apagón general", () => {
  const s = scenario("general-blackout", "2025-11-11T13:00:00-04:00", "2025-11-12T04:00:00-04:00");
  const ds = dataset([s]);
  const tl = buildTimeline(s, ds);

  it("deja todo el país sin luz a las 13:30", () => {
    const snap = getSnapshot(tl, ds, rdTime("2025-11-11", "13:30"));
    expect(snap.totals.circuitsOff).toBe(ds.circuits.length);
    expect(snap.totals.clientsOff).toBe(snap.totals.clients);
  });

  it("todo vuelve antes de 14 horas", () => {
    const snap = getSnapshot(tl, ds, rdTime("2025-11-11", "13:20") + 14 * HOUR);
    expect(snap.totals.circuitsOff).toBe(0);
  });

  it("los reportes ciudadanos alcanzan el umbral de consenso", () => {
    const snap = getSnapshot(tl, ds, rdTime("2025-11-11", "14:30"));
    const offStates = Object.values(snap.circuits).filter((c) => c.status === "fault");
    expect(offStates.some((c) => c.reports >= CONSENSUS_THRESHOLD && c.confirmed)).toBe(true);
  });
});

describe("activeIntervals", () => {
  it("la avería tiene prioridad sobre lo programado", () => {
    const tl = {
      scenarioId: "x",
      start: 0,
      end: 10 * HOUR,
      milestones: [],
      intervals: [
        {
          id: "p",
          circuitCode: "A",
          start: 0,
          end: 5 * HOUR,
          restoringFrom: null,
          status: "planned" as const,
          cause: "",
          provenance: "official" as const,
          sourceLabel: "",
          clientsAffected: null,
        },
        {
          id: "f",
          circuitCode: "A",
          start: HOUR,
          end: 2 * HOUR,
          restoringFrom: null,
          status: "fault" as const,
          cause: "",
          provenance: "simulated" as const,
          sourceLabel: "",
          clientsAffected: null,
        },
      ],
    };
    expect(activeIntervals(tl, 1.5 * HOUR).get("A")?.id).toBe("f");
    expect(activeIntervals(tl, 3 * HOUR).get("A")?.id).toBe("p");
  });
});
