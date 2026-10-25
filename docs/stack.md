# Stack y librerías open source

Cada elección responde tres preguntas: **por qué**, **qué alternativa se descartó** y **cuándo cambiarla**.
Estado: ✅ en uso en el repo · 🔜 planificado en el roadmap.

Criterios de selección: licencia permisiva (MIT, Apache-2.0, BSD, ISC), mantenimiento activo, tipos de TypeScript de primera clase, que funcione igual en servidor y navegador cuando aplica, y que se pueda reemplazar detrás de una interfaz.

## Base del monorepo

| Librería                                  | Estado | Por qué                                                               | Alternativa descartada                                             | Cuándo cambiar                           |
| ----------------------------------------- | ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| **pnpm workspaces**                       | ✅     | Instalación rápida, estricta con dependencias fantasma                | npm/yarn workspaces                                                | —                                        |
| **TypeScript estricto**                   | ✅     | Un solo lenguaje en web, API, móvil y scripts                         | —                                                                  | —                                        |
| **Zod**                                   | ✅     | Esquemas = tipos + validación en runtime; se comparten entre API y UI | Yup, io-ts, Valibot (más liviano; evaluar si el bundle móvil pesa) | Si el tamaño del bundle importa, Valibot |
| **Vitest**                                | ✅     | Rápido, compatible con Vite, misma API que Jest                       | Jest                                                               | —                                        |
| **ESLint + typescript-eslint + Prettier** | ✅     | Estándar del ecosistema                                               | Biome (más rápido, menos reglas)                                   | Si el lint se vuelve lento               |
| **Husky + lint-staged + commitlint**      | ✅     | Calidad antes del commit; historial legible                           | lefthook                                                           | —                                        |
| **Renovate**                              | ✅     | Actualizaciones agrupadas y programadas                               | Dependabot                                                         | —                                        |
| **Turborepo**                             | 🔜     | Caché de tareas cuando el CI pase de ~5 min                           | Nx                                                                 | Al tener 8+ paquetes                     |

## Datos e ingesta

| Librería                                 | Estado | Por qué                                                                             | Notas                                                                                   |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **exceljs**                              | ✅     | Lee el Excel de Edenorte; mantenido y sin las alertas de seguridad de `xlsx` en npm |                                                                                         |
| **pdfplumber** (Python, solo referencia) | ✅     | Extracción por posición de palabras del PDF de Edeeste                              | En producción: `unpdf`/`pdfjs-dist` en Node                                             |
| **Cheerio**                              | 🔜     | Parsear el HTML de Edesur sin navegador                                             | Liviano y estable                                                                       |
| **Crawlee** o **Playwright**             | 🔜     | Solo si una página requiere JavaScript                                              | Ya está Playwright para tests e2e                                                       |
| **undici** (fetch de Node)               | 🔜     | Descargas con timeout, reintentos y `If-Modified-Since`                             | Incluido en Node 22                                                                     |
| **rss-parser**                           | 🔜     | Avisos de Edeeste vía RSS de medios                                                 | Guardar solo hechos, nunca el texto completo                                            |
| **BullMQ** + Redis                       | 🔜     | Jobs programados (ingesta), reintentos con backoff, colas de notificaciones         | Alternativa sin Redis: `pg-boss` sobre Postgres; útil al inicio para tener menos piezas |

## Backend

| Librería                                              | Estado | Por qué                                                                                 | Alternativa                                                       |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Fastify**                                           | ✅     | Rápido, plugins (CORS, helmet, rate limit), logging pino integrado, `inject` para tests | Hono (si se despliega en edge), NestJS (más estructura, más peso) |
| **@fastify/helmet, cors, rate-limit**                 | ✅     | Seguridad base                                                                          | —                                                                 |
| **Drizzle ORM**                                       | ✅     | SQL tipado y cercano a SQL; buen soporte de tipos personalizados (PostGIS)              | Prisma (soporte PostGIS limitado), Kysely (query builder puro)    |
| **postgres (postgres.js)**                            | ✅     | Driver rápido, plantillas seguras contra inyección                                      | `pg`                                                              |
| **PostgreSQL 16 + PostGIS**                           | ✅     | Consultas espaciales (punto en polígono, cercanía), índices GiST                        | —                                                                 |
| **pg_trgm** (extensión)                               | 🔜     | Coincidencia aproximada de nombres de sectores ("Bo. Los Melones" ≈ "Los Melones")      | —                                                                 |
| **h3-js** (Uber H3)                                   | 🔜     | Agrupar reportes por celdas hexagonales: consenso por zona y privacidad                 | S2, geohash                                                       |
| **Better Auth**                                       | 🔜     | Autenticación para empresas y panel institucional (email, OAuth, organizaciones)        | Lucia (descontinuada), Auth.js                                    |
| **pino**                                              | ✅     | Logs JSON estructurados; ya viene con Fastify                                           | —                                                                 |
| **OpenTelemetry**                                     | 🔜     | Trazas y métricas estándar, sin atarse a un proveedor                                   | —                                                                 |
| **Sentry** (o GlitchTip, compatible y autohospedable) | 🔜     | Errores en web, API y móvil                                                             | —                                                                 |

## Mapas y geografía

| Librería                                     | Estado           | Por qué                                                                                                                                                                  | Notas                    |
| -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **d3-geo + d3-zoom**                         | ✅               | Mapa vectorial sin teselas: funciona offline y en un HTML único (ADR 0002)                                                                                               | Nivel provincia/circuito |
| **mapshaper**                                | ✅ (herramienta) | Simplificar y limpiar GeoJSON                                                                                                                                            | Solo en desarrollo       |
| **MapLibre GL JS**                           | 🔜               | Mapa con calles, WebGL, estilos abiertos; bifurcación libre de Mapbox GL                                                                                                 | Para el producto web     |
| **@vis.gl/react-maplibre** (react-map-gl v8) | 🔜               | Componentes React para MapLibre                                                                                                                                          | —                        |
| **PMTiles + Protomaps**                      | 🔜               | Mapa base de OpenStreetMap en un solo archivo servido desde almacenamiento estático (S3, R2 o Supabase Storage). Casi sin costo, sin depender de un proveedor de teselas | —                        |
| **Turf.js**                                  | 🔜               | Operaciones geoespaciales en JS (buffers, distancias, punto en polígono)                                                                                                 | —                        |
| **supercluster**                             | 🔜               | Agrupar miles de puntos en el mapa                                                                                                                                       | —                        |
| **@maplibre/maplibre-react-native**          | 🔜               | Mismo motor de mapas en la app móvil                                                                                                                                     | —                        |

Fuentes geográficas para producción: **ONE** (Oficina Nacional de Estadística) o **geoBoundaries** (CC BY 4.0) para límites; **OpenStreetMap** (ODbL, exige atribución) para calles y sectores.

## Frontend web

| Librería                          | Estado | Por qué                                                                    | Alternativa                  |
| --------------------------------- | ------ | -------------------------------------------------------------------------- | ---------------------------- |
| **Next.js (App Router)**          | ✅     | SSR para páginas públicas indexables ("¿Hay luz en Baní?"), stack conocido | Remix, Astro                 |
| **React 19**                      | ✅     | —                                                                          | —                            |
| **Vite + vite-plugin-singlefile** | ✅     | Presentación en un solo HTML                                               | —                            |
| **TanStack Query**                | 🔜     | Caché y reintentos de datos de la API                                      | SWR                          |
| **Zustand**                       | 🔜     | Estado de UI compartido (escenario, selección) si crece                    | Context + reducer            |
| **Serwist**                       | 🔜     | PWA: funcionar sin conexión y "instalar" en el celular                     | next-pwa (sin mantenimiento) |

## Móvil

| Librería                   | Estado | Por qué                                                            |
| -------------------------- | ------ | ------------------------------------------------------------------ |
| **Expo + Expo Router**     | 🔜     | Stack que ya dominas; actualizaciones OTA; builds en la nube (EAS) |
| **expo-notifications**     | 🔜     | Push a Android e iOS con un solo servicio                          |
| **expo-location**          | 🔜     | Ubicación solo al reportar, con permiso explícito                  |
| **MMKV** o **expo-sqlite** | 🔜     | Caché local del último estado conocido para uso sin conexión       |

## Calidad y pruebas

| Herramienta        | Estado | Uso                                                |
| ------------------ | ------ | -------------------------------------------------- |
| **Vitest**         | ✅     | Unitarias e integración                            |
| **fastify.inject** | ✅     | Tests de API sin abrir puertos                     |
| **Playwright**     | 🔜     | E2E de la web y capturas en ancho de celular       |
| **Testcontainers** | 🔜     | Tests del repositorio Postgres contra PostGIS real |
| **MSW**            | 🔜     | Simular la API en tests de UI                      |

## Infraestructura (propuesta inicial, barata)

| Pieza              | Opción                              | Por qué                                               |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| API + workers      | Railway, Fly.io o un VPS con Docker | Contenedores simples; pasar a otro proveedor es fácil |
| Postgres + PostGIS | Supabase o Neon                     | Ya conoces Supabase; ambos soportan PostGIS           |
| Redis              | Upstash o el mismo VPS              | Solo cuando entre BullMQ                              |
| Web                | Vercel o Cloudflare Pages           | Despliegue por PR                                     |
| Teselas            | PMTiles en Cloudflare R2            | Sin costo de salida de datos                          |
| Analítica          | PostHog o Umami (autohospedable)    | Métricas sin vender datos                             |

## Licencia del proyecto

Hoy el `package.json` dice `UNLICENSED` (todos los derechos reservados). Es lo habitual mientras se busca inversión. Opciones a decidir:

- **Cerrado** (actual): máximo control comercial.
- **AGPL-3.0**: código abierto, pero quien lo ofrezca como servicio debe publicar sus cambios. Atractivo para el sector público.
- **Núcleo abierto**: abrir `domain` y los adaptadores de datos (transparencia), mantener cerrados el panel B2B y B2G.
