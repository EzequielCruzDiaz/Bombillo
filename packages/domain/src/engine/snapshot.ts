import type {
  Alert,
  Circuit,
  CircuitState,
  Dataset,
  OutageInterval,
  ProvinceState,
  Snapshot,
} from "../schemas";
import { noise } from "./random";
import type { Timeline } from "./timeline";
import { formatRd, MINUTE } from "./time";

/** Reportes necesarios en 30 minutos para dar por confirmado un corte sin dato oficial. */
export const CONSENSUS_THRESHOLD = 5;
const ALERT_LIMIT = 40;

type Interval = Timeline["intervals"][number];

/**
 * Fotografía del país en el instante `at`. Función pura: mismas entradas,
 * misma salida. La usan la API (GET /snapshot) y la web sin cambios.
 */
export function getSnapshot(timeline: Timeline, dataset: Dataset, at: number): Snapshot {
  const byCode = new Map(dataset.circuits.map((c) => [c.code, c]));
  const active = activeIntervals(timeline, at);

  const circuits: Record<string, CircuitState> = {};
  const provinces: Record<string, ProvinceState> = {};
  for (const p of dataset.provinces) {
    provinces[p.id] = { clients: 0, clientsOff: 0, ratioOff: 0, circuitsOff: 0 };
  }

  const totals = {
    clients: 0,
    clientsOff: 0,
    circuitsOff: 0,
    circuitsPlanned: 0,
    circuitsFault: 0,
    reports: 0,
  };

  for (const c of dataset.circuits) {
    const interval = active.get(c.code);
    const state = circuitState(c, interval, at);
    circuits[c.code] = state;

    const prov = provinces[c.provinceId];
    totals.clients += c.clients;
    if (prov) prov.clients += c.clients;
    totals.reports += state.reports;

    if (state.status !== "on" && interval) {
      const off = Math.min(c.clients, interval.clientsAffected ?? c.clients);
      totals.clientsOff += off;
      totals.circuitsOff += 1;
      if (interval.status === "planned") totals.circuitsPlanned += 1;
      else totals.circuitsFault += 1;
      if (prov) {
        prov.clientsOff += off;
        prov.circuitsOff += 1;
      }
    }
  }

  for (const p of Object.values(provinces)) {
    p.ratioOff = p.clients > 0 ? p.clientsOff / p.clients : 0;
  }

  return { at, circuits, provinces, totals, alerts: buildAlerts(timeline, byCode, dataset, at) };
}

/** Intervalo vigente por circuito. Si hay dos, la avería pesa más que lo programado. */
export function activeIntervals(timeline: Timeline, at: number): Map<string, Interval> {
  const map = new Map<string, Interval>();
  for (const it of timeline.intervals) {
    if (it.start > at) break; // ordenados por inicio
    if (at >= it.end) continue;
    const current = map.get(it.circuitCode);
    if (!current || (current.status === "planned" && it.status === "fault")) {
      map.set(it.circuitCode, it);
    }
  }
  return map;
}

function circuitState(c: Circuit, interval: Interval | undefined, at: number): CircuitState {
  const slot = Math.floor(at / (10 * MINUTE));
  if (!interval) {
    // Ruido: a veces alguien reporta "sin luz" en un circuito con luz.
    // El filtro de consenso lo descarta: sirve para mostrar el anti-abuso.
    const fake = noise(c.code, slot, "fake") < 0.025 ? 1 + Math.floor(noise(c.code, slot) * 2) : 0;
    return {
      status: "on",
      cause: null,
      provenance: null,
      reports: 0,
      confirmed: false,
      discardedReports: fake,
    };
  }

  const restoring = interval.restoringFrom !== null && at >= interval.restoringFrom;
  const elapsed = Math.min(at - interval.start, 60 * MINUTE);
  const ramp = elapsed / (60 * MINUTE);
  const perHalfHour = Math.max(2, c.clients / 350);
  const jitter = 0.6 + 0.8 * noise(c.code, slot, "r");
  const reports = Math.round(perHalfHour * ramp * jitter * (restoring ? 0.35 : 1));

  return {
    status: restoring ? "restoring" : interval.status,
    cause: interval.cause,
    provenance: interval.provenance,
    reports,
    confirmed: interval.provenance !== "simulated" || reports >= CONSENSUS_THRESHOLD,
    discardedReports: 0,
  };
}

function buildAlerts(
  timeline: Timeline,
  byCode: Map<string, Circuit>,
  dataset: Dataset,
  at: number,
): Alert[] {
  const provinceName = new Map(dataset.provinces.map((p) => [p.id, p.name]));
  const alerts: Alert[] = timeline.milestones.filter((m) => m.at <= at);

  for (const it of timeline.intervals) {
    if (it.start > at) break;
    const c = byCode.get(it.circuitCode);
    if (!c) continue;
    const place = `${c.municipality}, ${provinceName.get(c.provinceId) ?? c.provinceId}`;
    const clients = (it.clientsAffected ?? c.clients).toLocaleString("es-DO");
    alerts.push(startAlert(it, c, place, clients));
    if (it.end <= at) {
      alerts.push({
        id: `${it.id}:end`,
        at: it.end,
        level: "ok",
        title: `Volvió la luz · ${c.code}`,
        body: `${place}. Corte de ${duration(it.end - it.start)}.`,
        circuitCode: c.code,
        provinceId: c.provinceId,
        provenance: it.provenance,
      });
    }
  }

  // Los eventos masivos (apagón general) generan cientos de avisos iguales:
  // se agrupan para que el feed siga siendo legible.
  return collapseBursts(alerts)
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(0, ALERT_LIMIT);
}

function startAlert(it: OutageInterval, c: Circuit, place: string, clients: string): Alert {
  const base = {
    id: `${it.id}:start`,
    at: it.start,
    circuitCode: c.code,
    provinceId: c.provinceId,
    provenance: it.provenance,
  };
  if (it.status === "planned") {
    return {
      ...base,
      level: "warning",
      title: `Corte programado · ${c.code}`,
      body: `${place}. ${it.cause}. ${clients} clientes hasta las ${formatRd(it.end, false)}.`,
    };
  }
  return {
    ...base,
    level: "critical",
    title: `Sin luz · ${c.code}`,
    body: `${place}. ${it.cause}. ${clients} clientes afectados.`,
  };
}

function collapseBursts(alerts: Alert[]): Alert[] {
  const groups = new Map<string, Alert[]>();
  for (const a of alerts) {
    if (!a.circuitCode) continue;
    const key = `${a.at}|${a.level}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  const collapsed = new Set<string>();
  const summaries: Alert[] = [];
  for (const [key, list] of groups) {
    if (list.length < 8) continue;
    list.forEach((a) => collapsed.add(a.id));
    const first = list[0]!;
    summaries.push({
      id: `burst:${key}`,
      at: first.at,
      level: first.level,
      title:
        first.level === "ok"
          ? `Volvió la luz en ${list.length} circuitos`
          : first.level === "warning"
            ? `${list.length} cortes programados a la misma hora`
            : `${list.length} circuitos sin luz al mismo tiempo`,
      body: list
        .slice(0, 6)
        .map((a) => a.circuitCode)
        .join(", ")
        .concat(list.length > 6 ? " y otros." : "."),
      provenance: first.provenance,
    });
  }
  return [...alerts.filter((a) => !collapsed.has(a.id)), ...summaries];
}

function duration(ms: number): string {
  const mins = Math.round(ms / MINUTE);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Historial de un circuito dentro del escenario (para la ficha de detalle). */
export function circuitHistory(timeline: Timeline, code: string, upTo: number): Interval[] {
  return timeline.intervals.filter((it) => it.circuitCode === code && it.start <= upTo);
}
