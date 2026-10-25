import type { LngLat } from "@bombillo/domain";

type Ring = number[][];
export type Geometry =
  { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

const polygons = (g: Geometry): Ring[][] =>
  g.type === "Polygon" ? [g.coordinates] : g.coordinates;

/** Ray casting sobre el anillo exterior, restando los huecos. */
function inRing([x, y]: LngLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function contains(g: Geometry, p: LngLat): boolean {
  return polygons(g).some(
    ([outer, ...holes]) => !!outer && inRing(p, outer) && !holes.some((h) => inRing(p, h)),
  );
}

/**
 * Punto interior aproximado: centroide del polígono mayor si cae dentro;
 * si no, el punto de una rejilla interior más cercano a ese centroide.
 */
export function interiorPoint(g: Geometry): LngLat {
  const largest = polygons(g)
    .map((poly) => ({ poly, area: Math.abs(ringArea(poly[0] ?? [])) }))
    .sort((a, b) => b.area - a.area)[0]!.poly;
  const outer = largest[0]!;
  const c = centroid(outer);
  if (contains(g, c)) return c;
  const xs = outer.map((p) => p[0]!);
  const ys = outer.map((p) => p[1]!);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  let best: LngLat = c;
  let bestD = Infinity;
  for (let i = 0; i <= 40; i++) {
    for (let j = 0; j <= 40; j++) {
      const p: LngLat = [minX + ((maxX - minX) * i) / 40, minY + ((maxY - minY) * j) / 40];
      if (!contains(g, p)) continue;
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
      if (d < bestD) [best, bestD] = [p, d];
    }
  }
  return [Math.round(best[0] * 1e4) / 1e4, Math.round(best[1] * 1e4) / 1e4];
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    a += (r[j]![0]! + r[i]![0]!) * (r[j]![1]! - r[i]![1]!);
  }
  return a / 2;
}

function centroid(r: Ring): LngLat {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j]![0]! * r[i]![1]! - r[i]![0]! * r[j]![1]!;
    x += (r[j]![0]! + r[i]![0]!) * f;
    y += (r[j]![1]! + r[i]![1]!) * f;
    a += f;
  }
  return [Math.round((x / (3 * a)) * 1e4) / 1e4, Math.round((y / (3 * a)) * 1e4) / 1e4];
}
