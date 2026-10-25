import { buildTimeline, type Dataset, type Timeline } from "@bombillo/domain";

export type ProvinceGeo = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string; name: string };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  }>;
};

/**
 * Puerto de datos de la UI. La misma interfaz sirve para:
 *  - LocalDataSource: todo en el navegador (demo offline, presentación).
 *  - ApiDataSource: datos y líneas de tiempo desde la API.
 * Los componentes nunca saben cuál están usando.
 */
export interface DataSource {
  readonly mode: "local" | "api";
  getDataset(): Promise<Dataset>;
  getGeo(): Promise<ProvinceGeo>;
  getTimeline(scenarioId: string): Promise<Timeline>;
}

export class LocalDataSource implements DataSource {
  readonly mode = "local" as const;
  private readonly timelines = new Map<string, Timeline>();

  constructor(
    private readonly dataset: Dataset,
    private readonly geo: ProvinceGeo,
  ) {}

  async getDataset() {
    return this.dataset;
  }

  async getGeo() {
    return this.geo;
  }

  async getTimeline(id: string) {
    let tl = this.timelines.get(id);
    if (!tl) {
      const scenario = this.dataset.scenarios.find((s) => s.id === id);
      if (!scenario) throw new Error(`Escenario ${id} no existe`);
      tl = buildTimeline(scenario, this.dataset);
      this.timelines.set(id, tl);
    }
    return tl;
  }
}

export class ApiDataSource implements DataSource {
  readonly mode = "api" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly geo: ProvinceGeo,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`La API respondió ${res.status} en ${path}`);
    return (await res.json()) as T;
  }

  async getDataset(): Promise<Dataset> {
    const [provinces, scenarios] = await Promise.all([
      this.get<{ items: Dataset["provinces"] }>("/v1/provinces"),
      this.get<{ items: Array<Omit<Dataset["scenarios"][number], "seed">> }>("/v1/scenarios"),
    ]);
    const circuits: Dataset["circuits"] = [];
    let cursor: string | null = null;
    do {
      const page: { items: Dataset["circuits"]; nextCursor: string | null } = await this.get(
        `/v1/circuits?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      circuits.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return {
      generatedAt: new Date().toISOString(),
      provinces: provinces.items,
      circuits,
      plannedOutages: [],
      scenarios: scenarios.items.map((s) => ({ ...s, seed: 0 })),
    };
  }

  async getGeo() {
    return this.geo;
  }

  getTimeline(id: string) {
    return this.get<Timeline>(`/v1/scenarios/${encodeURIComponent(id)}/timeline`);
  }
}
