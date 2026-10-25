# Fuentes de datos

| Archivo en `raw/`                                         | Qué es                                               | Procedencia                                          | Notas                                                                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edenorte-mantenimientos-2026-10-19_23.xlsx`              | Excel oficial: 121 cortes en 79 circuitos            | `official`                                           | [Publicación](https://edenorte.com.do/mantenimientos-programados-del-19-al-23-de-octubre-2026/). Se lee la hoja "Publicacion Externa"; columnas por nombre.                                             |
| `edesur-mantenimientos-2026-10-17_23.json`                | Transcripción de la página semanal                   | `official` (cortes) / `simulated` (circuitos `SIM-`) | [Página](https://www.edesur.com.do/enlaces-empresa/mantenimientos-programados/). Sin códigos de circuito; día inferido del orden.                                                                       |
| `edeeste-control-abastecimiento-2025-02-11.pdf` y `.json` | Control de abastecimiento (rotación) del 11 feb 2025 | `official`                                           | Extraído con `scripts/python/extract_edeeste_pdf_reference.py`. Sirve como catálogo de circuitos.                                                                                                       |
| `edeeste-prensa-2026-10-20_21.json`                       | Hechos de notas de prensa (códigos, horas, causa)    | `press`                                              | Diario Libre y Atardecer. No se copia el texto de las notas.                                                                                                                                            |
| `provinces.simplified.geojson`                            | Límites de las 32 provincias, simplificados al 4 %   | —                                                    | Origen: [jeasoft/provinces_geojson](https://github.com/jeasoft/provinces_geojson), sin licencia explícita. **Solo para demo**; en producción usar la cartografía de la ONE o geoBoundaries (CC BY 4.0). |
| `municipalities.json`                                     | Centros aproximados de municipios                    | escritos a mano                                      | El script verifica que caigan dentro de su provincia.                                                                                                                                                   |
| `scenarios.json`                                          | Definición de los 4 escenarios, hechos y fuentes     | mixto                                                | Cada escenario declara qué partes son simuladas.                                                                                                                                                        |

## Datos simulados (siempre marcados)

- Clase A/B/C/D de cada circuito, según la distribución de clientes por clase publicada (A 38 %, B 7 %, C 19 %, D 36 %).
- Clientes por circuito cuando la fuente no los da (Edeeste, Edesur).
- Ubicación exacta del circuito (centro del municipio + desplazamiento).
- Averías, reportes ciudadanos, retrasos y horas de restablecimiento.

## Regenerar

```bash
pnpm data:build
```
