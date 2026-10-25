# ¿Llegó?

**La luz en República Dominicana, en vivo.** Mapa web y móvil que une los cortes programados de Edenorte, Edesur y Edeeste con reportes ciudadanos validados por consenso. Cada dato indica su procedencia: **oficial**, **prensa** o **simulado**.

> Estado: **demo funcional** para presentar al sector privado y público. Usa datos reales de octubre de 2026 y eventos históricos, combinados con escenarios simulados. Nombre provisional; proyecto independiente, no afiliado a ninguna distribuidora.

---

## Contenido

- [Qué hace](#qué-hace)
- [Escenarios de la demo](#escenarios-de-la-demo)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Scripts](#scripts)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Arquitectura](#arquitectura)
- [API](#api)
- [Datos y procedencia](#datos-y-procedencia)
- [Calidad](#calidad)
- [Subir a GitHub](#subir-a-github)
- [Documentación](#documentación)
- [Licencia](#licencia)

## Qué hace

- **Mapa por provincia y circuito** que se oscurece según el porcentaje de clientes sin luz.
- **Línea de tiempo** con reproducción para recorrer un escenario hora por hora.
- **Avisos** de cortes programados, averías y restablecimientos, con su fuente.
- **Ficha de cada circuito:** clientes, zonas, historial, reportes ciudadanos y consenso.
- **Pestaña de propuesta** con el modelo de negocio, para presentar.
- **Funciona sin conexión:** la presentación es un solo archivo HTML que se abre en el celular.

## Escenarios de la demo

| Escenario                                 | Base real                                                                         | Qué es simulado                        |
| ----------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| Semana de mantenimientos (19–23 oct 2026) | 121 cortes oficiales de Edenorte, programa de Edesur, avisos de Edeeste en prensa | Averías, retrasos, reportes            |
| Noche de déficit                          | Horas de corte por clase de circuito (datos CDEEE) y bloques de 2 h de Edeeste    | Fecha, clase de cada circuito, bloques |
| Apagón general (11 nov 2025)              | Hora del fallo (13:20), causa y restablecimiento en menos de 14 h                 | Hora de regreso de cada circuito       |
| Tormenta tropical                         | Daños reportados tras Ernesto (agosto 2024)                                       | Trayectoria y circuitos afectados      |

## Stack

| Capa                 | Tecnología                                                 |
| -------------------- | ---------------------------------------------------------- |
| Lenguaje             | TypeScript estricto                                        |
| Monorepo             | pnpm workspaces                                            |
| Dominio y validación | Zod + motor de simulación determinista                     |
| API                  | Fastify 5, Drizzle ORM, PostgreSQL 16 + PostGIS            |
| Web                  | Next.js 15 (App Router), React 19                          |
| Presentación         | Vite + vite-plugin-singlefile                              |
| Mapa                 | d3-geo + d3-zoom (SVG, sin teselas)                        |
| Datos                | exceljs, scripts de semilla con validación                 |
| Pruebas              | Vitest, `fastify.inject`                                   |
| Calidad              | ESLint, Prettier, Husky, lint-staged, commitlint, Renovate |
| Infraestructura      | Docker Compose, GitHub Actions                             |

Detalle, alternativas y librerías planificadas en [`docs/stack.md`](docs/stack.md).

## Requisitos

- Node.js 22 (ver `.nvmrc`)
- pnpm 10 (`corepack enable`)
- Git
- Docker, solo para usar la base de datos real (opcional)

## Instalación

```bash
pnpm install          # dependencias + hooks de Git
pnpm data:build       # genera la semilla desde packages/data/raw
pnpm check            # lint + typecheck + tests
pnpm dev:web          # http://localhost:3000 (modo demo, sin API)
```

API en memoria:

```bash
pnpm dev:api                                         # http://localhost:4000/health
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm dev:web   # web conectada a la API
```

Con PostgreSQL + PostGIS:

```bash
docker compose up -d db
export DATABASE_URL=postgres://bombillo:bombillo@localhost:5432/bombillo
pnpm --filter @bombillo/api db:migrate
DATA_SOURCE=postgres pnpm dev:api
```

Presentación en un solo archivo:

```bash
pnpm --filter @bombillo/presentation build   # apps/presentation/dist/index.html
```

Variables de entorno de ejemplo en [`.env.example`](.env.example).

## Scripts

| Comando                 | Qué hace                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm data:build`       | Regenera `packages/data/generated` desde las fuentes crudas |
| `pnpm dev:web`          | Web Next.js en el puerto 3000                               |
| `pnpm dev:api`          | API Fastify en el puerto 4000                               |
| `pnpm dev:presentation` | Presentación Vite en el puerto 5173                         |
| `pnpm check`            | Lint, typecheck y tests de todos los paquetes               |
| `pnpm build`            | Compila todas las apps                                      |
| `pnpm format`           | Formatea con Prettier                                       |
| `pnpm roadmap:docs`     | Regenera `docs/roadmap.md` desde el backlog                 |
| `pnpm github:bootstrap` | Crea etiquetas, milestones e issues en GitHub               |

## Estructura del repositorio

```
bombillo/
├── apps/
│   ├── api/            Fastify · REST v1 · repositorios memoria/Postgres · Drizzle
│   ├── web/            Next.js · modo demo o conectado a la API
│   └── presentation/   Vite → un solo index.html autocontenido
├── packages/
│   ├── domain/         Esquemas Zod + motor de simulación (con tests)
│   ├── data/           Fuentes crudas → semilla validada
│   └── ui/             Componentes React compartidos
├── docs/               Negocio, arquitectura, stack, estrategias, roadmap y ADRs
├── scripts/github/     Backlog y script que lo crea en GitHub
├── .github/            CI, plantillas de PR e issues, CODEOWNERS
└── docker-compose.yml  PostgreSQL + PostGIS, Redis y la API
```

## Arquitectura

```mermaid
flowchart LR
  EN[Edenorte · Excel] --> DATA
  ES[Edesur · HTML] --> DATA
  EE[Edeeste · prensa] --> DATA
  DATA["@bombillo/data"] --> DOM["@bombillo/domain"]
  DOM --> API["@bombillo/api"]
  DOM --> UI["@bombillo/ui"]
  UI --> WEB["@bombillo/web"]
  UI --> PRES["@bombillo/presentation"]
  WEB -. opcional .-> API
  API --> PG[(PostgreSQL + PostGIS)]
  CIU[Reportes ciudadanos] --> API
```

Principios:

- **El código de circuito es la llave del sistema.** Si una fuente no lo trae, se crea un circuito sintético `SIM-…` marcado como simulado.
- **Motor puro y determinista:** el mismo escenario da el mismo resultado en servidor, navegador y tests.
- **Puertos y adaptadores:** la API depende de `OutageRepository` (memoria o Postgres) y la UI de `DataSource` (local o API).

Más en [`docs/arquitectura.md`](docs/arquitectura.md) y [`docs/estrategias.md`](docs/estrategias.md).

## API

| Método | Ruta                                         | Descripción                                                 |
| ------ | -------------------------------------------- | ----------------------------------------------------------- |
| GET    | `/health`                                    | Estado del servicio                                         |
| GET    | `/v1/provinces`                              | Provincias                                                  |
| GET    | `/v1/circuits?provinceId&ede&q&limit&cursor` | Circuitos con paginación por cursor                         |
| GET    | `/v1/circuits/:code`                         | Ficha de un circuito                                        |
| GET    | `/v1/planned-outages?from&to&ede`            | Cortes programados en un rango                              |
| GET    | `/v1/scenarios`                              | Escenarios disponibles                                      |
| GET    | `/v1/scenarios/:id/timeline`                 | Línea de tiempo completa                                    |
| GET    | `/v1/scenarios/:id/snapshot?at`              | Estado del país en un instante                              |
| GET    | `/v1/scenarios/:id/circuits/:code?at`        | Estado e historial de un circuito                           |
| POST   | `/v1/reports`                                | Reporte ciudadano (límite de 3 por dispositivo cada 10 min) |

Los errores siguen un formato único: `{ type, title, status, issues? }`.

## Datos y procedencia

| Fuente               | Formato                                    | Procedencia                            |
| -------------------- | ------------------------------------------ | -------------------------------------- |
| Edenorte             | Excel semanal con código de circuito       | Oficial                                |
| Edesur               | Página web semanal, sin código de circuito | Oficial (circuitos `SIM-` simulados)   |
| Edeeste              | Avisos diarios en prensa y PDF histórico   | Prensa / oficial                       |
| Límites provinciales | GeoJSON simplificado                       | Solo para demo, sin licencia explícita |

Inventario completo y reglas en [`packages/data/SOURCES.md`](packages/data/SOURCES.md).

## Calidad

- TypeScript estricto con `noUncheckedIndexedAccess`.
- 29 tests: motor de simulación, integridad de la semilla y API.
- Hooks de Git: lint y formato en cada commit; mensajes con Conventional Commits.
- CI en GitHub Actions: instala, genera datos, verifica y compila web y presentación.
- Renovate agrupa las actualizaciones de dependencias cada lunes.

## Subir a GitHub

```bash
git init -b main && git add -A && git commit -m "chore(repo): estructura inicial"
gh repo create bombillo --private --source=. --push
pnpm install
pnpm github:bootstrap --dry-run
pnpm github:bootstrap
```

Después: reemplaza `@OWNER` en `.github/CODEOWNERS`, protege `main` e instala Renovate.

## Documentación

- [Modelo de negocio](docs/negocio.md)
- [Arquitectura y API](docs/arquitectura.md)
- [Stack y librerías](docs/stack.md)
- [Estrategias y lógica](docs/estrategias.md)
- [Roadmap](docs/roadmap.md)
- [Cómo contribuir](CONTRIBUTING.md) · [Seguridad](SECURITY.md)
- ADRs: [monorepo](docs/adr/0001-monorepo-pnpm.md) · [mapa vectorial](docs/adr/0002-mapa-vectorial-d3.md) · [procedencia de datos](docs/adr/0003-procedencia-de-datos.md)

## Licencia

Todos los derechos reservados (`UNLICENSED`) mientras se define la licencia final. Opciones en [`docs/stack.md`](docs/stack.md#licencia-del-proyecto).
