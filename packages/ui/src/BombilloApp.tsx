"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getSnapshot,
  HOUR,
  MINUTE,
  type Dataset,
  type Scenario,
  type Timeline as TimelineData,
} from "@bombillo/domain";
import type { DataSource, ProvinceGeo } from "./data-source";
import { MapGL } from "./components/MapGL";
import { MapView } from "./components/MapView";
import { Timeline } from "./components/Timeline";
import {
  AlertsFeed,
  CircuitDetail,
  Kpis,
  Legend,
  ProvinceDetail,
  ScenarioInfo,
} from "./components/Panels";
import { Pitch } from "./components/Pitch";

function canUseGL(): boolean {
  if (window.location.protocol === "file:") return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

type Tab = "avisos" | "detalle" | "escenario" | "propuesta";

type Props = {
  source: DataSource;
  /** Muestra la pestaña "Propuesta" (presentación para inversionistas). */
  showPitch?: boolean;
  brand?: ReactNode;
};

/** Momento inicial con algo que mirar en cada escenario. */
function featuredMoment(s: Scenario, start: number): number {
  switch (s.kind) {
    case "maintenance-week":
      return start + 28 * HOUR + 20 * MINUTE; // martes 20, 10:20
    case "generation-deficit":
      return start + 13 * HOUR + 20 * MINUTE; // 19:20, hora pico
    case "general-blackout":
      return start + 2 * HOUR; // 15:00, todo el país a oscuras
    case "storm":
      return start + 12 * HOUR;
  }
}

export function BombilloApp({ source, showPitch = false, brand }: Props) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [geo, setGeo] = useState<ProvinceGeo | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);
  const [tab, setTab] = useState<Tab>("avisos");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"3d" | "plano">("plano");
  const [glOk, setGlOk] = useState(false);
  useEffect(() => {
    if (canUseGL()) {
      setGlOk(true);
      setMapMode("3d");
    }
  }, []);

  useEffect(() => {
    Promise.all([source.getDataset(), source.getGeo()])
      .then(([ds, g]) => {
        setDataset(ds);
        setGeo(g);
        setScenarioId(ds.scenarios[0]?.id ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [source]);

  const scenario = dataset?.scenarios.find((s) => s.id === scenarioId) ?? null;

  useEffect(() => {
    if (!scenario) return;
    let cancelled = false;
    setPlaying(false);
    source
      .getTimeline(scenario.id)
      .then((tl) => {
        if (cancelled) return;
        setTimeline(tl);
        setAt(featuredMoment(scenario, tl.start));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [scenario, source]);

  // Reproducción: un paso del escenario cada 500 ms (x4 en modo rápido).
  useEffect(() => {
    if (!playing || !timeline || !scenario) return;
    const id = setInterval(() => {
      setAt((t) => {
        const next = t + scenario.stepMinutes * MINUTE * speed;
        if (next >= timeline.end) {
          setPlaying(false);
          return timeline.end;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [playing, timeline, scenario, speed]);

  const snapshot = useMemo(
    () => (timeline && dataset ? getSnapshot(timeline, dataset, at) : null),
    [timeline, dataset, at],
  );

  const selectCircuit = useCallback((code: string | null) => {
    setSelectedCircuit(code);
    if (code) {
      setTab("detalle");
      setSheetOpen(true);
    }
  }, []);
  const selectProvince = useCallback((id: string | null) => {
    setSelectedProvince(id);
    setSelectedCircuit(null);
    if (id) {
      setTab("detalle");
      setSheetOpen(true);
    }
  }, []);

  if (error) {
    return (
      <div className="app-state" role="alert">
        <h2>No se pudieron cargar los datos</h2>
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!dataset || !geo || !scenario || !timeline || !snapshot) {
    return (
      <div className="app-state" aria-busy="true">
        <p>Encendiendo el mapa…</p>
      </div>
    );
  }

  const circuit = selectedCircuit
    ? dataset.circuits.find((c) => c.code === selectedCircuit)
    : undefined;
  const province = dataset.provinces.find(
    (p) => p.id === (circuit?.provinceId ?? selectedProvince),
  );

  const tabs: Array<[Tab, string]> = [
    ["avisos", "Avisos"],
    ["detalle", "Detalle"],
    ["escenario", "Escenario"],
    ...(showPitch ? ([["propuesta", "Propuesta"]] as Array<[Tab, string]>) : []),
  ];

  return (
    <div className={`app${sheetOpen ? " sheet-open" : ""}`}>
      <header className="topbar">
        <div className="brand">{brand ?? <DefaultBrand />}</div>
        <label className="scenario-picker">
          <span className="sr-only">Escenario</span>
          <select
            id="scenario-select"
            value={scenario.id}
            onChange={(e) => {
              setScenarioId(e.target.value);
              setSelectedCircuit(null);
              setSelectedProvince(null);
            }}
          >
            {dataset.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="stage">
        <div className="map-wrap">
          <Kpis snapshot={snapshot} />
          {mapMode === "3d" && glOk ? (
            <MapGL
              geo={geo}
              circuits={dataset.circuits}
              snapshot={snapshot}
              selectedProvince={province?.id ?? null}
              selectedCircuit={selectedCircuit}
              onSelectProvince={selectProvince}
              onSelectCircuit={selectCircuit}
              onFail={() => setGlOk(false)}
            />
          ) : (
            <MapView
              geo={geo}
              circuits={dataset.circuits}
              snapshot={snapshot}
              selectedProvince={province?.id ?? null}
              selectedCircuit={selectedCircuit}
              onSelectProvince={selectProvince}
              onSelectCircuit={selectCircuit}
            />
          )}
          {glOk && (
            <button
              type="button"
              className="map-mode"
              onClick={() => setMapMode((m) => (m === "3d" ? "plano" : "3d"))}
            >
              {mapMode === "3d" ? "Mapa plano" : "Mapa 3D"}
            </button>
          )}
          <div className={`legend-wrap${legendOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="legend-toggle"
              aria-expanded={legendOpen}
              onClick={() => setLegendOpen((v) => !v)}
            >
              Leyenda
            </button>
            <Legend />
          </div>
        </div>
        <Timeline
          start={timeline.start}
          end={timeline.end}
          stepMinutes={scenario.stepMinutes}
          at={at}
          playing={playing}
          speed={speed}
          onChange={(t) => {
            setPlaying(false);
            setAt(t);
          }}
          onTogglePlay={() => {
            if (at >= timeline.end) setAt(timeline.start);
            setPlaying((p) => !p);
          }}
          onToggleSpeed={() => setSpeed((s) => (s === 1 ? 4 : 1))}
        />
      </main>

      <aside className="panel" aria-label="Información">
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen((v) => !v)}
        >
          <span className="sr-only">{sheetOpen ? "Contraer panel" : "Expandir panel"}</span>
        </button>
        <nav className="tabs" role="tablist">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : ""}
              onClick={() => {
                setTab(id);
                setSheetOpen(true);
              }}
            >
              {label}
              {id === "avisos" && snapshot.alerts.length > 0 && (
                <span className="badge">{Math.min(snapshot.alerts.length, 40)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="panel-body" role="tabpanel">
          {tab === "avisos" && (
            <AlertsFeed alerts={snapshot.alerts} onSelectCircuit={selectCircuit} />
          )}
          {tab === "detalle" &&
            (circuit ? (
              <CircuitDetail
                circuit={circuit}
                province={province}
                snapshot={snapshot}
                timeline={timeline}
                onClose={() => setSelectedCircuit(null)}
              />
            ) : province ? (
              <ProvinceDetail
                province={province}
                dataset={dataset}
                snapshot={snapshot}
                onSelectCircuit={selectCircuit}
                onClose={() => setSelectedProvince(null)}
              />
            ) : (
              <p className="empty">Toca una provincia o un circuito del mapa para ver su ficha.</p>
            ))}
          {tab === "escenario" && <ScenarioInfo scenario={scenario} />}
          {tab === "propuesta" && <Pitch />}
        </div>
      </aside>
    </div>
  );
}

function DefaultBrand() {
  return (
    <>
      <svg viewBox="0 0 24 24" className="logo" aria-hidden="true">
        <path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8v.5h6v-.5c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5z" />
        <rect x="9" y="17.6" width="6" height="1.6" rx=".6" />
        <rect x="9.8" y="20" width="4.4" height="1.6" rx=".6" />
      </svg>
      <span className="wordmark">Bombillo</span>
      <span className="tagline">la luz en RD, en vivo</span>
    </>
  );
}
