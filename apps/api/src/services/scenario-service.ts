import { buildTimeline, getSnapshot, type Snapshot, type Timeline } from "@bombillo/domain";
import type { OutageRepository } from "../repositories/types";

/**
 * Orquesta el motor de simulación. Las líneas de tiempo se calculan una vez
 * por escenario y se guardan en memoria (en producción iría a Redis).
 */
export class ScenarioService {
  private readonly cache = new Map<string, Timeline>();

  constructor(private readonly repo: OutageRepository) {}

  async timeline(scenarioId: string): Promise<Timeline | null> {
    const cached = this.cache.get(scenarioId);
    if (cached) return cached;
    const scenario = await this.repo.getScenario(scenarioId);
    if (!scenario) return null;
    const timeline = buildTimeline(scenario, await this.repo.loadDataset());
    this.cache.set(scenarioId, timeline);
    return timeline;
  }

  /** Fotografía en un instante; `at` fuera del escenario se ajusta a sus bordes. */
  async snapshot(scenarioId: string, at?: number): Promise<Snapshot | null> {
    const tl = await this.timeline(scenarioId);
    if (!tl) return null;
    const t = Math.min(tl.end, Math.max(tl.start, at ?? tl.start));
    return getSnapshot(tl, await this.repo.loadDataset(), t);
  }
}
