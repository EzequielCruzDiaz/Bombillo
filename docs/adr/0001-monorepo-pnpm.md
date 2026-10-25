# ADR 0001 · Monorepo con pnpm workspaces

**Estado:** aceptada · **Fecha:** 2026-10-23

## Contexto

La API, la web y la presentación comparten tipos, reglas del dominio y componentes.

## Decisión

Un monorepo con pnpm workspaces. Los paquetes internos se consumen como TypeScript fuente (`exports: ./src/index.ts`) y cada app los compila con su herramienta (tsx, Next, Vite).

## Consecuencias

- Un cambio en un esquema Zod rompe el typecheck en todas las apps a la vez (bueno).
- No hay paso de build intermedio para paquetes internos; Next necesita `transpilePackages`.
- Si el equipo crece, se puede sumar Turborepo para caché de tareas sin cambiar la estructura.
