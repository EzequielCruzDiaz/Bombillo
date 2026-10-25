import type { CircuitStatus, Ede, Provenance } from "@bombillo/domain";

const nf = new Intl.NumberFormat("es-DO");
export const num = (n: number) => nf.format(Math.round(n));
export const pct = (r: number) => `${(r * 100).toFixed(r > 0 && r < 0.1 ? 1 : 0)} %`;

export const STATUS_LABEL: Record<CircuitStatus, string> = {
  on: "Con luz",
  planned: "Corte programado",
  fault: "Sin luz (avería)",
  restoring: "Restableciendo",
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  official: "Dato oficial",
  press: "Prensa",
  simulated: "Simulado",
};

export const EDE_LABEL: Record<Ede | "shared", string> = {
  edenorte: "Edenorte",
  edesur: "Edesur",
  edeeste: "Edeeste",
  shared: "Edesur y Edeeste",
};
