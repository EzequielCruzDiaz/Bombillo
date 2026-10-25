import type { ProvinceGeo } from "./data-source";

type Ring = number[][];

/** Área con signo en el plano (lng, lat): positiva = antihorario. */
function signedArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j]![0]! - ring[i]![0]!) * (ring[j]![1]! + ring[i]![1]!);
  }
  return a / 2;
}

function orient(ring: Ring, clockwise: boolean): Ring {
  const isClockwise = signedArea(ring) < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

/**
 * d3-geo trabaja en la esfera y espera anillos exteriores en sentido horario
 * (lo contrario del RFC 7946). Con el sentido equivocado, cada provincia se
 * interpreta como "todo el planeta menos la provincia" y el mapa se ve como un
 * rectángulo lleno. Esta función normaliza el sentido antes de proyectar.
 */
export function rewindForD3(geo: ProvinceGeo): ProvinceGeo {
  const fixPolygon = (poly: Ring[]) => poly.map((ring, i) => orient(ring, i === 0));
  return {
    ...geo,
    features: geo.features.map((f) => {
      const g = f.geometry;
      const coordinates =
        g.type === "Polygon"
          ? fixPolygon(g.coordinates as Ring[])
          : (g.coordinates as Ring[][]).map(fixPolygon);
      return { ...f, geometry: { ...g, coordinates } };
    }),
  };
}
