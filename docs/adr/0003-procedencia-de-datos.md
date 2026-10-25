# ADR 0003 · Procedencia obligatoria en cada dato

**Estado:** aceptada · **Fecha:** 2026-10-23

## Contexto

La demo mezcla datos reales (Excel de Edenorte, página de Edesur, prensa sobre Edeeste, eventos históricos) con datos simulados. Ante inversionistas e instituciones, confundirlos destruye la credibilidad.

## Decisión

Todo circuito, corte y aviso lleva `provenance: official | press | simulated` y una `source` con etiqueta y URL. La UI lo muestra como etiqueta en cada aviso y ficha; cada escenario lista qué partes son simuladas.

## Consecuencias

- El script de semilla falla si un dato no valida contra el esquema.
- Los circuitos sintéticos usan el prefijo `SIM-` para que nunca se confundan con un código real.
