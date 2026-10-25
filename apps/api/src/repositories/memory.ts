import type { Dataset } from "@bombillo/domain";
import type { CitizenReport, CircuitFilter, OutageRepository, Page } from "./types";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Repositorio en memoria sobre la semilla. Ideal para demo y tests. */
export class MemoryRepository implements OutageRepository {
  private readonly reports: CitizenReport[] = [];

  constructor(private readonly dataset: Dataset) {}

  async listProvinces() {
    return this.dataset.provinces;
  }

  async listCircuits(filter: CircuitFilter): Promise<Page<Dataset["circuits"][number]>> {
    const q = filter.q ? normalize(filter.q) : null;
    const matches = this.dataset.circuits.filter(
      (c) =>
        (!filter.provinceId || c.provinceId === filter.provinceId) &&
        (!filter.ede || c.ede === filter.ede) &&
        (!q ||
          normalize(c.code).includes(q) ||
          normalize(c.municipality).includes(q) ||
          c.zones.some((z) => normalize(z).includes(q))),
    );
    // Paginación por cursor: el cursor es el último código devuelto (orden estable).
    const start = filter.cursor ? matches.findIndex((c) => c.code > filter.cursor!) : 0;
    const items = start < 0 ? [] : matches.slice(start, start + filter.limit);
    const last = items.at(-1);
    const hasMore = start >= 0 && start + filter.limit < matches.length;
    return { items, nextCursor: hasMore && last ? last.code : null };
  }

  async getCircuit(code: string) {
    return this.dataset.circuits.find((c) => c.code === code) ?? null;
  }

  async listPlannedOutages(range: {
    from: string;
    to: string;
    ede?: Dataset["circuits"][number]["ede"];
  }) {
    const from = Date.parse(range.from);
    const to = Date.parse(range.to);
    return this.dataset.plannedOutages.filter(
      (o) =>
        Date.parse(o.end) > from && Date.parse(o.start) < to && (!range.ede || o.ede === range.ede),
    );
  }

  async listScenarios() {
    return this.dataset.scenarios;
  }

  async getScenario(id: string) {
    return this.dataset.scenarios.find((s) => s.id === id) ?? null;
  }

  async loadDataset() {
    return this.dataset;
  }

  async saveReport(report: CitizenReport) {
    this.reports.push(report);
  }

  async countRecentReports(deviceHash: string, sinceIso: string) {
    const since = Date.parse(sinceIso);
    return this.reports.filter(
      (r) => r.deviceHash === deviceHash && Date.parse(r.receivedAt) >= since,
    ).length;
  }
}
