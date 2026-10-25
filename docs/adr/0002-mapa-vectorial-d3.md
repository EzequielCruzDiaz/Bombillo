# ADR 0002 · Mapa vectorial con d3-geo en lugar de teselas

**Estado:** aceptada para el MVP · **Fecha:** 2026-10-23

## Contexto

La demo debe funcionar en un solo archivo HTML, sin servidor de teselas y en celulares con mala conexión. El nivel de detalle necesario hoy es provincia y circuito, no calle.

## Decisión

Renderizar las 32 provincias (GeoJSON simplificado, ~280 KB) con d3-geo en SVG, con zoom y gestos vía d3-zoom.

## Consecuencias

- Funciona offline y dentro de un artifact o un PDF interactivo.
- No hay calles ni búsqueda por dirección. Cuando haga falta, migrar a MapLibre GL + teselas vectoriales (OpenStreetMap) manteniendo los mismos datos.
- **Trampa conocida:** d3-geo exige anillos exteriores en sentido horario (al revés del RFC 7946). `packages/ui/src/rewind.ts` los normaliza.
