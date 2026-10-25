import type {
  Alert,
  Circuit,
  CircuitClass,
  Dataset,
  Ede,
  OutageInterval,
  Scenario,
} from "../schemas";
import { between, noise } from "./random";
import { HOUR, MINUTE } from "./time";

/**
 * Una línea de tiempo es la lista de cortes (intervalos) de un escenario,
 * más los hitos que se muestran como avisos. Se calcula una sola vez por
 * escenario; después, cada fotografía (snapshot) es solo una consulta.
 */
export type Timeline = {
  scenarioId: string;
  start: number;
  end: number;
  intervals: Array<OutageInterval & { clientsAffected: number | null }>;
  milestones: Alert[];
};

type Ctx = { scenario: Scenario; dataset: Dataset; start: number; end: number };

const FAULT_CAUSES = [
  "Avería en transformador",
  "Rotura de conductor",
  "Disparo de protección en subestación",
  "Poste afectado por accidente de tránsito",
  "Avería en línea de media tensión",
];

export function buildTimeline(scenario: Scenario, dataset: Dataset): Timeline {
  const ctx: Ctx = {
    scenario,
    dataset,
    start: Date.parse(scenario.start),
    end: Date.parse(scenario.end),
  };
  const built = BUILDERS[scenario.kind](ctx);
  built.intervals.sort((a, b) => a.start - b.start || a.circuitCode.localeCompare(b.circuitCode));
  built.milestones.sort((a, b) => a.at - b.at);
  return { scenarioId: scenario.id, start: ctx.start, end: ctx.end, ...built };
}

type Built = Pick<Timeline, "intervals" | "milestones">;
const BUILDERS: Record<Scenario["kind"], (ctx: Ctx) => Built> = {
  "maintenance-week": maintenanceWeek,
  "generation-deficit": generationDeficit,
  "general-blackout": generalBlackout,
  storm,
};

/* ------------------------------------------------------------------ */
/* 1. Semana de mantenimientos: datos oficiales + averías simuladas     */
/* ------------------------------------------------------------------ */

function maintenanceWeek(ctx: Ctx): Built {
  const { dataset, scenario } = ctx;
  const intervals: Timeline["intervals"] = [];
  const known = new Set(dataset.circuits.map((c) => c.code));

  for (const o of dataset.plannedOutages) {
    const start = Date.parse(o.start);
    let end = Date.parse(o.end);
    if (end <= ctx.start || start >= ctx.end || !known.has(o.circuitCode)) continue;
    // Algunos trabajos se extienden más de lo anunciado (parte simulada).
    const overrun = noise(scenario.seed, o.id, "overrun");
    let cause = o.cause;
    if (overrun < 0.22) {
      end += Math.round(between(noise(o.id, "mins"), 30, 75) / 5) * 5 * MINUTE;
      cause = `${o.cause} · se extendió (simulado)`;
    }
    intervals.push({
      id: o.id,
      circuitCode: o.circuitCode,
      start,
      end,
      restoringFrom: end - 20 * MINUTE,
      status: "planned",
      cause,
      provenance: o.provenance,
      sourceLabel: o.source.label,
      clientsAffected: o.clientsAffected,
    });
  }

  intervals.push(...randomFaults(ctx, 4, 7));
  return { intervals, milestones: [] };
}

/** Averías no programadas repartidas por día (siempre simuladas). */
function randomFaults(ctx: Ctx, minPerDay: number, maxPerDay: number): Timeline["intervals"] {
  const { dataset, scenario } = ctx;
  const out: Timeline["intervals"] = [];
  const days = Math.ceil((ctx.end - ctx.start) / (24 * HOUR));
  for (let d = 0; d < days; d++) {
    const count = Math.floor(between(noise(scenario.seed, d, "n"), minPerDay, maxPerDay + 1));
    for (let i = 0; i < count; i++) {
      const pick = noise(scenario.seed, d, i, "circuit");
      const circuit = dataset.circuits[Math.floor(pick * dataset.circuits.length)];
      if (!circuit) continue;
      const start =
        ctx.start +
        d * 24 * HOUR +
        Math.round(noise(scenario.seed, d, i, "t") * 24 * 12) * 5 * MINUTE;
      const duration = Math.round(between(noise(scenario.seed, d, i, "dur"), 45, 240) / 5) * 5;
      const end = Math.min(start + duration * MINUTE, ctx.end);
      if (start >= ctx.end) continue;
      out.push({
        id: `fault-${scenario.id}-${d}-${i}`,
        circuitCode: circuit.code,
        start,
        end,
        restoringFrom: end - 25 * MINUTE,
        status: "fault",
        cause: FAULT_CAUSES[Math.floor(noise(d, i, "cause") * FAULT_CAUSES.length)] ?? "Avería",
        provenance: "simulated",
        sourceLabel: "Simulación",
        clientsAffected: null,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. Déficit de generación: rotación por bloques de 2 h según clase    */
/* ------------------------------------------------------------------ */

/** Horas diarias de corte por clase (presentación CDEEE citada por El Día). */
export const DAILY_HOURS_BY_CLASS: Record<CircuitClass, number> = { A: 0.6, B: 5, C: 7.3, D: 9.1 };

function generationDeficit(ctx: Ctx): Built {
  const { dataset, scenario } = ctx;
  const intervals: Timeline["intervals"] = [];
  // Bloques de 2 h que empiezan a "y 20", como el Control de Abastecimiento de Edeeste.
  const firstSlot = ctx.start + 20 * MINUTE;
  const slots = Math.floor((ctx.end - firstSlot) / (2 * HOUR));

  for (const c of dataset.circuits) {
    const hours = DAILY_HOURS_BY_CLASS[c.class];
    const exact = hours / 2;
    const blocks = Math.floor(exact) + (noise(scenario.seed, c.code, "extra") < exact % 1 ? 1 : 0);
    const chosen = weightedSample(slots, blocks, (i) => slotWeight(firstSlot + i * 2 * HOUR), [
      scenario.seed,
      c.code,
    ]);
    for (const i of chosen) {
      const start = firstSlot + i * 2 * HOUR;
      intervals.push({
        id: `rot-${c.code}-${i}`,
        circuitCode: c.code,
        start,
        end: start + 2 * HOUR,
        restoringFrom: start + 2 * HOUR - 10 * MINUTE,
        status: "planned",
        cause: "Rotación por déficit de generación",
        provenance: "simulated",
        sourceLabel: "Simulación según horas por clase de circuito",
        clientsAffected: null,
      });
    }
  }
  intervals.push(...randomFaults(ctx, 2, 4));

  const milestones: Alert[] = [
    {
      id: "deficit-start",
      at: ctx.start,
      level: "warning",
      title: "Déficit de generación en el sistema",
      body: "Plantas fuera por mantenimiento. Las distribuidoras rotan circuitos en bloques de 2 horas.",
      provenance: "simulated",
    },
    {
      id: "deficit-peak",
      at: ctx.start + 12 * HOUR,
      level: "critical",
      title: "Hora pico: mayor demanda de la noche",
      body: "Los circuitos C y D concentran más horas de corte en este tramo.",
      provenance: "simulated",
    },
  ];
  return { intervals, milestones };
}

/** Más peso a la tarde-noche (pico de demanda) y menos de madrugada. */
function slotWeight(ms: number): number {
  const hour = new Date(ms - 4 * HOUR).getUTCHours();
  if (hour >= 18 && hour < 23) return 3;
  if (hour >= 10 && hour < 18) return 2;
  return 1;
}

function weightedSample(
  n: number,
  k: number,
  weight: (i: number) => number,
  seedKeys: Array<string | number>,
): number[] {
  // Muestreo sin reemplazo de Efraimidis-Spirakis: clave = u^(1/w).
  return Array.from({ length: n }, (_, i) => ({
    i,
    key: Math.pow(noise(...seedKeys, "slot", i), 1 / weight(i)),
  }))
    .sort((a, b) => b.key - a.key)
    .slice(0, Math.max(0, Math.min(k, n)))
    .map((x) => x.i);
}

/* ------------------------------------------------------------------ */
/* 3. Apagón general: reconstrucción del 11 de noviembre de 2025        */
/* ------------------------------------------------------------------ */

const RESTORE_WINDOW_H: Record<Ede, [number, number]> = {
  edenorte: [1.5, 7],
  edesur: [2.5, 10],
  edeeste: [4, 13.5],
};

function generalBlackout(ctx: Ctx): Built {
  const { dataset, scenario } = ctx;
  const t0 = ctx.start + 20 * MINUTE; // 13:20 según el Ministerio de Energía y Minas
  const intervals: Timeline["intervals"] = [];
  let lastRestore = t0;

  for (const c of dataset.circuits) {
    const [min, max] = RESTORE_WINDOW_H[c.ede];
    // Los circuitos A (24 h, hospitales y zonas priorizadas) suelen volver antes.
    const bias = c.class === "A" ? 1.8 : c.class === "B" ? 1.2 : 1;
    const r = Math.pow(noise(scenario.seed, c.code, "restore"), bias);
    const restore = t0 + Math.round(between(r, min, max) * 12) * 5 * MINUTE;
    lastRestore = Math.max(lastRestore, restore);
    intervals.push({
      id: `bo-${c.code}`,
      circuitCode: c.code,
      start: t0,
      end: restore,
      restoringFrom: Math.max(t0 + 5 * MINUTE, restore - 30 * MINUTE),
      status: "fault",
      cause: "Apagón general del sistema",
      provenance: "simulated",
      sourceLabel: "Hora de restablecimiento simulada",
      clientsAffected: null,
    });
  }

  const milestones: Alert[] = [
    {
      id: "bo-trigger",
      at: t0,
      level: "critical",
      title: "Apagón general en todo el país",
      body: "Salida simultánea de las unidades de CESPM (San Pedro de Macorís) y la Central Quisqueya.",
      provenance: "press",
    },
    {
      id: "bo-teams",
      at: t0 + 25 * MINUTE,
      level: "info",
      title: "ETED despliega equipos técnicos",
      body: "Inicia la recuperación por circuitos con apoyo de las hidroeléctricas.",
      provenance: "press",
    },
    {
      id: "bo-half",
      at: t0 + 6 * HOUR,
      level: "info",
      title: "Recuperación progresiva",
      body: "La zona norte recupera primero en esta simulación. El este queda para el final.",
      provenance: "simulated",
    },
    {
      id: "bo-done",
      at: lastRestore,
      level: "ok",
      title: "Servicio restablecido",
      body: "En el evento real, las distribuidoras restablecieron el servicio en menos de 14 horas.",
      provenance: "press",
    },
  ];
  return { intervals, milestones };
}

/* ------------------------------------------------------------------ */
/* 4. Tormenta: inspirada en el paso de Ernesto (agosto 2024)           */
/* ------------------------------------------------------------------ */

const STORM_PROVINCES: Record<string, number> = {
  // Probabilidad de avería por circuito. Provincias citadas en los informes de las EDE.
  "la-altagracia": 0.6,
  "santo-domingo": 0.5,
  "distrito-nacional": 0.45,
  "san-cristobal": 0.45,
  peravia: 0.4,
  azua: 0.4,
  barahona: 0.45,
  pedernales: 0.5,
  baoruco: 0.35,
  "san-pedro-de-macoris": 0.35,
  "la-romana": 0.3,
  "el-seibo": 0.3,
  "hato-mayor": 0.25,
};

const STORM_CAUSES = [
  "Avería por vientos",
  "Árbol sobre la red",
  "Poste caído",
  "Línea en el suelo",
];

function storm(ctx: Ctx): Built {
  const { dataset, scenario } = ctx;
  const intervals: Timeline["intervals"] = [];
  // La tormenta entra por el este y avanza hacia el oeste en unas 10 horas.
  const east = -68.3;
  const west = -71.9;
  const landfall = ctx.start + 3 * HOUR;

  for (const c of dataset.circuits) {
    const p = STORM_PROVINCES[c.provinceId] ?? (c.ede === "edenorte" ? 0.03 : 0.08);
    if (noise(scenario.seed, c.code, "hit") >= p) continue;
    const progress = Math.min(1, Math.max(0, (east - c.location[0]) / (east - west)));
    const start =
      landfall + Math.round((progress * 10 + noise(c.code, "jitter") * 2) * 12) * 5 * MINUTE;
    const r = noise(scenario.seed, c.code, "repair");
    const repairH = between(r * r, 2.5, 28);
    const end = Math.min(ctx.end, start + Math.round(repairH * 12) * 5 * MINUTE);
    intervals.push({
      id: `st-${c.code}`,
      circuitCode: c.code,
      start,
      end,
      restoringFrom: end - 40 * MINUTE,
      status: "fault",
      cause: STORM_CAUSES[Math.floor(noise(c.code, "c") * STORM_CAUSES.length)] ?? "Avería",
      provenance: "simulated",
      sourceLabel: "Simulación",
      clientsAffected: null,
    });
  }

  const milestones: Alert[] = [
    {
      id: "st-watch",
      at: ctx.start,
      level: "warning",
      title: "Alerta por tormenta tropical",
      body: "Bandas de lluvia y viento se acercan a la costa este. Carga tus equipos y guarda agua.",
      provenance: "simulated",
    },
    {
      id: "st-landfall",
      at: landfall,
      level: "critical",
      title: "Vientos fuertes en La Altagracia",
      body: "Empiezan las averías en el este. La tormenta avanza hacia el oeste.",
      provenance: "simulated",
    },
    {
      id: "st-reference",
      at: ctx.end - 6 * HOUR,
      level: "info",
      title: "Referencia real: Ernesto, agosto 2024",
      body: "Edeeste restableció 22 circuitos con 84,207 usuarios afectados (10.23 %). Santo Domingo y La Altagracia fueron las más afectadas.",
      provenance: "press",
    },
  ];
  return { intervals, milestones };
}

export function circuitsByCode(circuits: Circuit[]): Map<string, Circuit> {
  return new Map(circuits.map((c) => [c.code, c]));
}
