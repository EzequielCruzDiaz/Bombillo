# Cómo contribuir

## Flujo

1. Toma un issue del backlog (`docs/roadmap.md`) y asígnatelo.
2. Crea una rama desde `main`: `feat/M1-02-adaptador-edenorte`.
3. Trabaja en commits pequeños con **Conventional Commits** en español:

   ```
   feat(ingest): leer adjunto xlsx del post semanal de Edenorte
   fix(ui): evitar que el reloj se parta en dos líneas en celular
   docs(data): documentar fuente de Edesur
   ```

   Ámbitos válidos: `api`, `web`, `presentation`, `domain`, `data`, `ui`, `ingest`, `mobile`, `docs`, `ci`, `deps`, `repo`.

4. Antes de abrir el PR: `pnpm check`. Los hooks de Husky ya corren lint y formato en cada commit.
5. Abre el PR con la plantilla, enlaza el issue (`Cierra #12`) y espera el CI en verde.
6. Se fusiona con **squash** para mantener un historial limpio.

## Principios

- **Procedencia de datos siempre visible** (ADR 0003).
- **Dominio puro:** nada de I/O ni aleatoriedad no determinista en `packages/domain`.
- **Validar en el borde** con Zod.
- **Decisiones técnicas grandes** se registran como ADR en `docs/adr/` usando `0000-plantilla.md`.
- **Accesibilidad:** foco visible, textos alternativos, contraste suficiente, `prefers-reduced-motion`.

## Reglas del código

1. **Esquemas primero.** Todo tipo nuevo se define con Zod en `packages/domain/src/schemas.ts` y se infiere con `z.infer`.
2. **Códigos sintéticos** empiezan con `SIM-`; nunca se inventa un código que parezca real.
3. **Hora de RD = UTC-04:00** sin horario de verano: usar `rdTime()`, `toRdIso()` y `formatRd()`.
4. **Privacidad:** el `deviceId` se guarda como hash y las ubicaciones de reportes se agregan antes de mostrarse.
5. **Sin secretos en el repo:** variables nuevas van a `.env.example` y a `apps/api/src/config.ts`.
6. **Nunca editar `packages/data/generated/` a mano;** regenerar con `pnpm data:build`.
7. TypeScript estricto, sin `any`; importaciones de tipos con `import type`; colores solo con tokens CSS.

## Antes de abrir un PR

1. `pnpm check` en verde.
2. Si cambió `raw/` o el script de semilla: `pnpm data:build` y revisar el resumen.
3. Si cambió la UI: probar a 390 px y en escritorio.
4. Actualizar `docs/`, `SOURCES.md` o un ADR si aplica.
