import type { Circuit, Dataset, Ede, PlannedOutage, Province, Scenario } from "@bombillo/domain";

export type CircuitFilter = {
  provinceId?: string;
  ede?: Ede;
  q?: string;
  limit: number;
  cursor?: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type CitizenReport = {
  id: string;
  circuitCode: string | null;
  location: [number, number];
  status: "off" | "on";
  receivedAt: string;
  /** Huella anónima del dispositivo (hash), nunca el identificador real. */
  deviceHash: string;
};

/**
 * Puerto de acceso a datos (arquitectura hexagonal). Las rutas y servicios
 * dependen de esta interfaz, no de Postgres. La demo usa la implementación en
 * memoria; producción usa PostgresRepository sin tocar las rutas.
 */
export interface OutageRepository {
  listProvinces(): Promise<Province[]>;
  listCircuits(filter: CircuitFilter): Promise<Page<Circuit>>;
  getCircuit(code: string): Promise<Circuit | null>;
  listPlannedOutages(range: { from: string; to: string; ede?: Ede }): Promise<PlannedOutage[]>;
  listScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | null>;
  /** Dataset completo para el motor de simulación. */
  loadDataset(): Promise<Dataset>;
  saveReport(report: CitizenReport): Promise<void>;
  countRecentReports(deviceHash: string, sinceIso: string): Promise<number>;
}
