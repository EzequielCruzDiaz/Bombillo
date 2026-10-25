/**
 * Aleatoriedad determinista. El mismo escenario con la misma semilla produce
 * exactamente el mismo resultado en el servidor, en la web y en los tests.
 */

/** Hash FNV-1a de 32 bits: convierte un texto en una semilla numérica. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Generador mulberry32: rápido, suficiente para simulación (no para criptografía). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número en [0, 1) derivado de varias claves, sin estado compartido. */
export function noise(...keys: Array<string | number>): number {
  return createRng(hashString(keys.join("|")))();
}

export function between(rand: number, min: number, max: number): number {
  return min + rand * (max - min);
}
