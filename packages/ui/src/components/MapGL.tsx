"use client";

import { useEffect, useRef } from "react";
import type { ExpressionSpecification, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Circuit, Snapshot } from "@bombillo/domain";
import type { ProvinceGeo } from "../data-source";

export type MapViewProps = {
  geo: ProvinceGeo;
  circuits: Circuit[];
  snapshot: Snapshot | null;
  selectedProvince: string | null;
  selectedCircuit: string | null;
  onSelectProvince: (id: string | null) => void;
  onSelectCircuit: (code: string | null) => void;
};

type Props = MapViewProps & {
  onFail: () => void;
};

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const DR_BOUNDS: [[number, number], [number, number]] = [
  [-72.1, 17.35],
  [-68.1, 20.1],
];
const MAX_HEIGHT = 12000;

const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#0b0f15" } }],
};

async function pickStyle(): Promise<string | StyleSpecification> {
  try {
    const res = await fetch(BASEMAP_STYLE, { signal: AbortSignal.timeout(4000) });
    return res.ok ? BASEMAP_STYLE : OFFLINE_STYLE;
  } catch {
    return OFFLINE_STYLE;
  }
}

type Bbox = [[number, number], [number, number]];

function bboxOf(coords: unknown, box: [number, number, number, number]): void {
  if (Array.isArray(coords) && typeof coords[0] === "number") {
    const [x, y] = coords as [number, number];
    box[0] = Math.min(box[0], x);
    box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x);
    box[3] = Math.max(box[3], y);
  } else if (Array.isArray(coords)) {
    for (const c of coords) bboxOf(c, box);
  }
}

function provinceBounds(geo: ProvinceGeo, id: string): Bbox | null {
  const f = geo.features.find((x) => x.properties.id === id);
  if (!f) return null;
  const box: [number, number, number, number] = [180, 90, -180, -90];
  bboxOf(f.geometry.coordinates, box);
  return [
    [box[0], box[1]],
    [box[2], box[3]],
  ];
}

export function MapGL(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  const applyRef = useRef<() => void>(() => {});
  const prevSelected = useRef<{ province: string | null; circuit: string | null }>({
    province: null,
    circuit: null,
  });

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let map: MapLibreMap | null = null;

    (async () => {
      try {
        const [maplibregl, style] = await Promise.all([import("maplibre-gl"), pickStyle()]);
        if (disposed || !containerRef.current) return;
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

        const m = new maplibregl.Map({
          container: containerRef.current,
          style,
          bounds: DR_BOUNDS,
          fitBoundsOptions: {
            padding: { top: 90, bottom: 40, left: 24, right: 24 },
            pitch: 32,
            bearing: -6,
          },
          pitch: 32,
          bearing: -6,
          maxPitch: 70,
          minZoom: 5.5,
          maxBounds: [
            [-76, 15.5],
            [-64, 22.5],
          ],
          attributionControl: { compact: true },
          dragRotate: true,
        });
        map = m;
        mapRef.current = m;
        m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

        m.on("error", (e) => {
          console.warn("[maplibre]", e.error?.message ?? e);
          if (
            String(e.error?.message ?? "")
              .toLowerCase()
              .includes("webgl")
          )
            latest.current.onFail();
        });

        m.on("load", () => {
          if (disposed) return;
          const map = m;
          const { geo, circuits } = latest.current;

          map.addSource("provinces", { type: "geojson", data: geo as never, promoteId: "id" });
          map.addSource("circuits", {
            type: "geojson",
            promoteId: "code",
            data: {
              type: "FeatureCollection",
              features: circuits.map((c) => ({
                type: "Feature",
                properties: { code: c.code, size: Math.sqrt(c.clients) },
                geometry: { type: "Point", coordinates: c.location },
              })),
            },
          });

          map.addLayer({
            id: "prov-3d",
            type: "fill-extrusion",
            source: "provinces",
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["feature-state", "ratio"], 0],
                0,
                "#d9a53a",
                0.5,
                "#6b4a1a",
                1,
                "#161c27",
              ],
              "fill-extrusion-height": ["coalesce", ["feature-state", "h"], 2000],
              "fill-extrusion-opacity": 0.82,
              "fill-extrusion-vertical-gradient": true,
              "fill-extrusion-color-transition": { duration: 600, delay: 0 },
              "fill-extrusion-height-transition": { duration: 600, delay: 0 },
            },
          });
          map.addLayer({
            id: "prov-line",
            type: "line",
            source: "provinces",
            paint: {
              "line-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#f4c35a",
                "#3a4557",
              ],
              "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.5, 0.8],
            },
          });

          map.addLayer({
            id: "circuit-halo",
            type: "circle",
            source: "circuits",
            paint: {
              "circle-radius": 0,
              "circle-color": "#ef5350",
              "circle-opacity": 0,
              "circle-blur": 0.8,
              "circle-pitch-alignment": "map",
            },
          });
          map.addLayer({
            id: "circuit-dot",
            type: "circle",
            source: "circuits",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                6,
                ["+", 1.5, ["*", ["get", "size"], 0.012]],
                11,
                ["+", 4, ["*", ["get", "size"], 0.05]],
              ],
              "circle-color": [
                "match",
                ["coalesce", ["feature-state", "status"], "on"],
                "planned",
                "#5aa7e8",
                "fault",
                "#ef5350",
                "restoring",
                "#8fd16a",
                "#f4c35a",
              ],
              "circle-stroke-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                3,
                0.8,
              ],
              "circle-stroke-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#ffffff",
                "#0b0f15",
              ],
              "circle-pitch-alignment": "map",
            },
          });

          map.on("click", (e) => {
            const dots = map!.queryRenderedFeatures(e.point, { layers: ["circuit-dot"] });
            if (dots[0]) {
              latest.current.onSelectCircuit(String(dots[0].properties?.code ?? dots[0].id));
              return;
            }
            const prov = map!.queryRenderedFeatures(e.point, { layers: ["prov-3d"] });
            if (prov[0]) {
              latest.current.onSelectProvince(String(prov[0].properties?.id ?? prov[0].id));
              return;
            }
            latest.current.onSelectProvince(null);
            latest.current.onSelectCircuit(null);
          });
          for (const layer of ["circuit-dot", "prov-3d"]) {
            map.on("mouseenter", layer, () => (map!.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layer, () => (map!.getCanvas().style.cursor = ""));
          }

          const t0 = performance.now();
          const pulse = (now: number) => {
            if (disposed || !map) return;
            const phase = ((now - t0) % 1600) / 1600;
            const isFault: ExpressionSpecification = ["==", ["feature-state", "status"], "fault"];
            map.setPaintProperty("circuit-halo", "circle-radius", [
              "case",
              isFault,
              10 + 14 * phase,
              0,
            ]);
            map.setPaintProperty("circuit-halo", "circle-opacity", [
              "case",
              isFault,
              0.45 * (1 - phase),
              0,
            ]);
            raf = requestAnimationFrame(pulse);
          };
          raf = requestAnimationFrame(pulse);

          readyRef.current = true;
          applyState();
        });
      } catch {
        if (!disposed) latest.current.onFail();
      }
    })();

    function applyState() {
      const m = mapRef.current;
      if (!m || !readyRef.current) return;
      const { snapshot, circuits, selectedProvince, selectedCircuit, geo } = latest.current;

      if (snapshot) {
        const maxClients = Math.max(1, ...Object.values(snapshot.provinces).map((p) => p.clients));
        for (const [id, p] of Object.entries(snapshot.provinces)) {
          const base = 2500 + (p.clients / maxClients) * (MAX_HEIGHT - 2500);
          m.setFeatureState(
            { source: "provinces", id },
            {
              ratio: Math.min(1, p.ratioOff * 1.15),
              h: base * (1 - 0.7 * Math.min(1, p.ratioOff)),
            },
          );
        }
        for (const c of circuits) {
          m.setFeatureState(
            { source: "circuits", id: c.code },
            { status: snapshot.circuits[c.code]?.status ?? "on" },
          );
        }
      }

      const prev = prevSelected.current;
      if (prev.province && prev.province !== selectedProvince)
        m.setFeatureState({ source: "provinces", id: prev.province }, { selected: false });
      if (selectedProvince)
        m.setFeatureState({ source: "provinces", id: selectedProvince }, { selected: true });
      if (prev.circuit && prev.circuit !== selectedCircuit)
        m.setFeatureState({ source: "circuits", id: prev.circuit }, { selected: false });
      if (selectedCircuit)
        m.setFeatureState({ source: "circuits", id: selectedCircuit }, { selected: true });

      if (prev.circuit !== selectedCircuit || prev.province !== selectedProvince) {
        const c = selectedCircuit ? circuits.find((x) => x.code === selectedCircuit) : undefined;
        if (c) {
          m.flyTo({ center: c.location, zoom: Math.max(m.getZoom(), 10), duration: 1400 });
        } else if (selectedProvince) {
          const b = provinceBounds(geo, selectedProvince);
          if (b) m.fitBounds(b, { padding: 60, duration: 1400, pitch: 40 });
        } else {
          m.fitBounds(DR_BOUNDS, {
            padding: { top: 90, bottom: 40, left: 24, right: 24 },
            duration: 1200,
            pitch: 32,
            bearing: -6,
          });
        }
        prevSelected.current = { province: selectedProvince, circuit: selectedCircuit };
      }
    }

    applyRef.current = applyState;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      readyRef.current = false;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyRef.current();
  }, [props.snapshot, props.selectedProvince, props.selectedCircuit, props.circuits, props.geo]);

  return (
    <div className="map map-gl">
      <div
        ref={containerRef}
        className="map-gl-canvas"
        role="img"
        aria-label="Mapa 3D de República Dominicana con el estado de la energía por provincia y circuito"
      />
    </div>
  );
}
