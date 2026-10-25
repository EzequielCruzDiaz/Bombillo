import { z } from "zod";

/**
 * Esquemas del dominio. Son la única fuente de verdad de los tipos:
 * la API valida con ellos, el script de datos los usa para validar la semilla
 * y la UI importa los tipos inferidos.
 */

export const EdeSchema = z.enum(["edenorte", "edesur", "edeeste"]);
export type Ede = z.infer<typeof EdeSchema>;

/**
 * Procedencia de cada dato. Es la regla más importante del proyecto:
 * nunca se mezcla un dato oficial con uno simulado sin que se sepa.
 *  - official: publicado por la distribuidora (web, Excel, PDF).
 *  - press: publicado por un medio citando a la distribuidora.
 *  - simulated: generado por el motor para el escenario.
 */
export const ProvenanceSchema = z.enum(["official", "press", "simulated"]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const SourceRefSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  date: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** Clasificación histórica de circuitos por nivel de pago y pérdidas (A = 24 h). */
export const CircuitClassSchema = z.enum(["A", "B", "C", "D"]);
export type CircuitClass = z.infer<typeof CircuitClassSchema>;

export const LngLatSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export type LngLat = z.infer<typeof LngLatSchema>;

export const ProvinceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  ede: z.union([EdeSchema, z.literal("shared")]),
  center: LngLatSchema,
});
export type Province = z.infer<typeof ProvinceSchema>;

export const CircuitSchema = z.object({
  /** Código operativo de la EDE (p. ej. CENO101). Si es sintético empieza con "SIM-". */
  code: z.string().min(3),
  ede: EdeSchema,
  name: z.string(),
  provinceId: z.string(),
  municipality: z.string(),
  location: LngLatSchema,
  /** true cuando la ubicación es aproximada (centro del municipio + desplazamiento). */
  locationApproximate: z.boolean(),
  clients: z.number().int().positive(),
  class: CircuitClassSchema,
  zones: z.array(z.string()),
  provenance: ProvenanceSchema,
  source: SourceRefSchema,
});
export type Circuit = z.infer<typeof CircuitSchema>;

export const PlannedOutageSchema = z.object({
  id: z.string(),
  circuitCode: z.string(),
  ede: EdeSchema,
  /** ISO 8601 con zona horaria de RD (-04:00). */
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  cause: z.string(),
  clientsAffected: z.number().int().nonnegative().nullable(),
  zones: z.array(z.string()),
  provenance: ProvenanceSchema,
  source: SourceRefSchema,
  note: z.string().optional(),
});
export type PlannedOutage = z.infer<typeof PlannedOutageSchema>;

export const ScenarioKindSchema = z.enum([
  "maintenance-week",
  "generation-deficit",
  "general-blackout",
  "storm",
]);
export type ScenarioKind = z.infer<typeof ScenarioKindSchema>;

export const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: ScenarioKindSchema,
  title: z.string(),
  summary: z.string(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  stepMinutes: z.number().int().positive(),
  /** Hechos reales en los que se apoya el escenario. */
  facts: z.array(z.object({ text: z.string(), source: SourceRefSchema })),
  /** Qué partes son simuladas, dicho en claro para la audiencia. */
  simulatedParts: z.array(z.string()),
  seed: z.number().int(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const DatasetSchema = z.object({
  generatedAt: z.string(),
  provinces: z.array(ProvinceSchema),
  circuits: z.array(CircuitSchema),
  plannedOutages: z.array(PlannedOutageSchema),
  scenarios: z.array(ScenarioSchema),
});
export type Dataset = z.infer<typeof DatasetSchema>;

/* ---------- Salida del motor ---------- */

export const CircuitStatusSchema = z.enum(["on", "planned", "fault", "restoring"]);
export type CircuitStatus = z.infer<typeof CircuitStatusSchema>;

export type OutageInterval = {
  id: string;
  circuitCode: string;
  start: number; // epoch ms
  end: number; // epoch ms (fin del corte; incluye la fase de restablecimiento)
  restoringFrom: number | null; // epoch ms desde el que se muestra "restableciendo"
  status: Exclude<CircuitStatus, "on" | "restoring">;
  cause: string;
  provenance: Provenance;
  sourceLabel: string;
};

export type AlertLevel = "info" | "warning" | "critical" | "ok";

export type Alert = {
  id: string;
  at: number;
  level: AlertLevel;
  title: string;
  body: string;
  circuitCode?: string;
  provinceId?: string;
  provenance: Provenance;
};

export type CircuitState = {
  status: CircuitStatus;
  cause: string | null;
  provenance: Provenance | null;
  /** Reportes ciudadanos simulados en los últimos 30 minutos. */
  reports: number;
  /** Consenso: suficientes reportes para confirmar el estado sin dato oficial. */
  confirmed: boolean;
  /** Reportes que el filtro anti-abuso descartó (circuito con luz). */
  discardedReports: number;
};

export type ProvinceState = {
  clients: number;
  clientsOff: number;
  ratioOff: number;
  circuitsOff: number;
};

export type Snapshot = {
  at: number;
  circuits: Record<string, CircuitState>;
  provinces: Record<string, ProvinceState>;
  totals: {
    clients: number;
    clientsOff: number;
    circuitsOff: number;
    circuitsPlanned: number;
    circuitsFault: number;
    reports: number;
  };
  alerts: Alert[];
};
