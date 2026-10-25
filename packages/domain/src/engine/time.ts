/** República Dominicana usa UTC-04:00 todo el año (sin horario de verano). */
export const RD_OFFSET = "-04:00";
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** "2026-10-19" + "10:00" → epoch ms en hora de RD. */
export function rdTime(date: string, hhmm: string): number {
  return Date.parse(`${date}T${hhmm}:00${RD_OFFSET}`);
}

export function toRdIso(ms: number): string {
  const d = new Date(ms - 4 * HOUR);
  return d.toISOString().replace(/\.\d{3}Z$/, RD_OFFSET);
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Etiqueta corta en hora de RD, p. ej. "mar 20 · 18:20". */
export function formatRd(ms: number, withDay = true): string {
  const d = new Date(ms - 4 * HOUR);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (!withDay) return `${hh}:${mm}`;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} · ${hh}:${mm}`;
}
