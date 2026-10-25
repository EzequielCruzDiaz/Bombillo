# Roadmap

> Generado desde `scripts/github/backlog.json` con `pnpm roadmap:docs`. No editar a mano.

| Milestone | Objetivo | Issues |
|---|---|---|
| M0 · Fundaciones | Repo, CI, calidad automática y demo publicada. | 4 |
| M1 · Ingesta automática | Las tres EDE entran solas a la base de datos, con crudo guardado e idempotencia. | 6 |
| M2 · Geografía limpia | Límites con licencia válida, sectores y resolución de nombres de zonas. | 4 |
| M3 · Reportes y consenso | Reportes ciudadanos reales, celdas H3, reputación y máquina de estados. | 5 |
| M4 · Tiempo real y alertas | SSE, suscripciones por sector y notificaciones push. | 3 |
| M5 · App móvil | App Expo con mapa, reportar y alertas. | 4 |
| M6 · Web producto | MapLibre + PMTiles, páginas por provincia, PWA. | 3 |
| M7 · Empresas e instituciones | Panel B2B multisede, panel B2G y API con llaves. | 4 |
| M8 · Operación | Despliegue, observabilidad, respaldo y seguridad. | 4 |
| MV · Validación de negocio | Entrevistas, piloto y métricas para la ronda. | 4 |

## M0 · Fundaciones

Repo, CI, calidad automática y demo publicada.

- **M0-01** Crear repositorio en GitHub y proteger la rama main · _infra_ · alta
- **M0-02** Activar Renovate y revisar el primer lote de actualizaciones · _infra_ · media
- **M0-03** Tests e2e de la demo con Playwright a 390 px y 1440 px · _web_ · media
- **M0-04** Decidir la licencia del proyecto · _negocio_ · media

## M1 · Ingesta automática

Las tres EDE entran solas a la base de datos, con crudo guardado e idempotencia.

- **M1-01** Crear paquete `@bombillo/ingest` con la interfaz SourceAdapter · _ingesta_ · alta
- **M1-02** Adaptador Edenorte: descubrir el post semanal y leer el Excel · _ingesta_ · alta
- **M1-03** Adaptador Edesur: scraper HTML con Cheerio · _ingesta_ · alta
- **M1-04** Adaptador Edeeste: avisos en prensa y noticias de su web · _ingesta_ · media
- **M1-05** Tabla raw_documents e idempotencia por sha256 · _api_ · alta
- **M1-06** Programar jobs de ingesta (pg-boss o BullMQ) · _ingesta_ · media

## M2 · Geografía limpia

Límites con licencia válida, sectores y resolución de nombres de zonas.

- **M2-01** Reemplazar límites provinciales por fuente con licencia válida · _datos_ · alta
- **M2-02** Catálogo de sectores desde OpenStreetMap · _datos_ · alta
- **M2-03** Resolución de nombres de zonas con pg_trgm y tabla de alias · _datos_ · alta
- **M2-04** Relación circuito ↔ sector con peso · _datos_ · media

## M3 · Reportes y consenso

Reportes ciudadanos reales, celdas H3, reputación y máquina de estados.

- **M3-01** Agrupar reportes por celda H3 (resolución 8) · _api_ · alta
- **M3-02** Worker de consenso con decaimiento temporal · _dominio_ · alta
- **M3-03** Máquina de estados de circuito y tabla de eventos · _dominio_ · alta
- **M3-04** Reputación de dispositivos · _seguridad_ · media
- **M3-05** Detección de ráfagas coordinadas · _seguridad_ · media

## M4 · Tiempo real y alertas

SSE, suscripciones por sector y notificaciones push.

- **M4-01** Endpoint SSE de cambios de estado · _api_ · alta
- **M4-02** Suscripciones por sector y tokens de push · _api_ · alta
- **M4-03** Cola de notificaciones con reglas anti-cansancio · _api_ · media

## M5 · App móvil

App Expo con mapa, reportar y alertas.

- **M5-01** Crear `apps/mobile` con Expo Router · _movil_ · alta
- **M5-02** Mapa móvil con MapLibre React Native · _movil_ · alta
- **M5-03** Botón «¿Tienes luz?» con ubicación bajo permiso · _movil_ · alta
- **M5-04** Último estado conocido sin conexión · _movil_ · media

## M6 · Web producto

MapLibre + PMTiles, páginas por provincia, PWA.

- **M6-01** Migrar el mapa web a MapLibre + PMTiles · _web_ · media
- **M6-02** Páginas indexables «¿Hay luz en <provincia>?» · _web_ · media
- **M6-03** PWA instalable con Serwist · _web_ · baja

## M7 · Empresas e instituciones

Panel B2B multisede, panel B2G y API con llaves.

- **M7-01** Autenticación y organizaciones con Better Auth · _seguridad_ · media
- **M7-02** Panel B2B: sedes, alertas por sede y reporte mensual · _web_ · media
- **M7-03** API pública con llaves y límites por plan · _api_ · baja
- **M7-04** Panel B2G: programado vs. reportado · _web_ · media

## M8 · Operación

Despliegue, observabilidad, respaldo y seguridad.

- **M8-01** Desplegar API, worker y web · _infra_ · alta
- **M8-02** Observabilidad: OpenTelemetry + Sentry/GlitchTip · _infra_ · media
- **M8-03** Respaldo diario de la base de datos y prueba de restauración · _infra_ · media
- **M8-04** Revisión legal de privacidad (Ley 172-13) · _seguridad_ · media

## MV · Validación de negocio

Entrevistas, piloto y métricas para la ronda.

- **MV-01** 20 entrevistas con negocios multisede · _negocio_ · alta
- **MV-02** Consulta institucional sobre datos estructurados de interrupciones · _negocio_ · alta
- **MV-03** Piloto en una provincia y tablero de métricas · _negocio_ · media
- **MV-04** Plan financiero de 12 meses · _negocio_ · media
