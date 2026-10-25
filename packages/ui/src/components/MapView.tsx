"use client";

import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Circuit, Snapshot } from "@bombillo/domain";
import type { ProvinceGeo } from "../data-source";
import { rewindForD3 } from "../rewind";

type Props = {
  geo: ProvinceGeo;
  circuits: Circuit[];
  snapshot: Snapshot | null;
  selectedProvince: string | null;
  selectedCircuit: string | null;
  onSelectProvince: (id: string | null) => void;
  onSelectCircuit: (code: string | null) => void;
};

const WIDTH = 1000;
const HEIGHT = 640;

/**
 * Mapa vectorial sin teselas: funciona sin conexión y pesa ~280 KB.
 * Las provincias se "encienden" según la proporción de clientes con luz.
 */
export function MapView(props: Props) {
  const { geo, circuits, snapshot, selectedProvince, selectedCircuit } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [k, setK] = useState(1);
  const [transform, setTransform] = useState("translate(0,0) scale(1)");

  const { paths, project } = useMemo(() => {
    const fixed = rewindForD3(geo);
    const projection = geoMercator().fitExtent(
      [
        [16, 16],
        [WIDTH - 16, HEIGHT - 16],
      ],
      fixed as unknown as GeoPermissibleObjects,
    );
    const path = geoPath(projection);
    return {
      paths: fixed.features.map((f) => ({
        id: f.properties.id,
        name: f.properties.name,
        d: path(f as unknown as GeoPermissibleObjects) ?? "",
      })),
      project: (lnglat: [number, number]) => projection(lnglat) ?? [0, 0],
    };
  }, [geo]);

  const points = useMemo(
    () => circuits.map((c) => ({ c, xy: project(c.location), r: 2.2 + Math.sqrt(c.clients) / 22 })),
    [circuits, project],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 9])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on("zoom", (event) => {
        const t = event.transform;
        setTransform(`translate(${t.x},${t.y}) scale(${t.k})`);
        setK(t.k);
      });
    zoomRef.current = behavior;
    select(svg).call(behavior).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (svg && zoomRef.current)
      select(svg).transition().duration(250).call(zoomRef.current.scaleBy, factor);
  };
  const reset = () => {
    const svg = svgRef.current;
    if (svg && zoomRef.current)
      select(svg).transition().duration(300).call(zoomRef.current.transform, zoomIdentity);
  };

  return (
    <div className="map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Mapa de República Dominicana con el estado de la energía por provincia y circuito"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            props.onSelectProvince(null);
            props.onSelectCircuit(null);
          }
        }}
      >
        <defs>
          <radialGradient id="halo">
            <stop offset="0%" stopColor="var(--st-fault)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--st-fault)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={transform}>
          <Provinces
            paths={paths}
            snapshot={snapshot}
            selected={selectedProvince}
            k={k}
            onSelect={props.onSelectProvince}
          />
          <g className="circuits">
            {points.map(({ c, xy, r }) => {
              const st = snapshot?.circuits[c.code]?.status ?? "on";
              const scaled = r / Math.sqrt(k);
              const off = st !== "on";
              return (
                <g
                  key={c.code}
                  transform={`translate(${xy[0]},${xy[1]})`}
                  className={`circuit st-${st}${selectedCircuit === c.code ? " is-selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onSelectCircuit(c.code);
                  }}
                >
                  {st === "fault" && <circle r={scaled * 3.2} fill="url(#halo)" className="halo" />}
                  <circle r={off ? scaled * 1.25 : scaled * 0.8} className="dot" />
                  <circle r={Math.max(scaled * 2.4, 9 / k)} className="hit" />
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <div className="map-controls" aria-label="Controles del mapa">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Acercar">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Alejar">
          −
        </button>
        <button type="button" onClick={reset} aria-label="Ver todo el país" className="reset">
          ⤢
        </button>
      </div>
    </div>
  );
}

type ProvincesProps = {
  paths: Array<{ id: string; name: string; d: string }>;
  snapshot: Snapshot | null;
  selected: string | null;
  k: number;
  onSelect: (id: string | null) => void;
};

const Provinces = memo(function Provinces({
  paths,
  snapshot,
  selected,
  k,
  onSelect,
}: ProvincesProps) {
  return (
    <g className="provinces" style={{ strokeWidth: 0.9 / k }}>
      {paths.map((p) => {
        const ratio = snapshot?.provinces[p.id]?.ratioOff ?? 0;
        // 0 % sin luz = provincia encendida; 100 % = apagada.
        const dark = Math.round(Math.min(1, ratio * 1.15) * 100);
        return (
          <path
            key={p.id}
            d={p.d}
            className={selected === p.id ? "province is-selected" : "province"}
            style={{ fill: `color-mix(in oklab, var(--prov-dark) ${dark}%, var(--prov-lit))` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p.id);
            }}
          >
            <title>{`${p.name}: ${Math.round(ratio * 100)} % de clientes sin luz`}</title>
          </path>
        );
      })}
    </g>
  );
});
