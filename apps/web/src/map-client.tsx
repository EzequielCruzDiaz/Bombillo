"use client";

import { useMemo } from "react";
import { dataset, provinces } from "@bombillo/data";
import { ApiDataSource, BombilloApp, LocalDataSource, type DataSource } from "@bombillo/ui";

/**
 * Elige la fuente de datos según el entorno:
 *  - NEXT_PUBLIC_API_URL definido → la API (Fastify) calcula las líneas de tiempo.
 *  - vacío → modo demo, todo en el navegador.
 */
export function MapClient({ apiUrl }: { apiUrl: string }) {
  const source: DataSource = useMemo(
    () => (apiUrl ? new ApiDataSource(apiUrl, provinces) : new LocalDataSource(dataset, provinces)),
    [apiUrl],
  );
  return <BombilloApp source={source} showPitch />;
}
