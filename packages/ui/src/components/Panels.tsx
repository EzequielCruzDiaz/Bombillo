import {
  CONSENSUS_THRESHOLD,
  circuitHistory,
  formatRd,
  type Alert,
  type Circuit,
  type Dataset,
  type Province,
  type Scenario,
  type Snapshot,
  type Timeline,
} from "@bombillo/domain";
import { EDE_LABEL, num, pct, PROVENANCE_LABEL, STATUS_LABEL } from "../format";

/* ------------------------------- KPIs ------------------------------- */

export function Kpis({ snapshot }: { snapshot: Snapshot }) {
  const t = snapshot.totals;
  return (
    <dl className="kpis">
      <div>
        <dt>Clientes sin luz</dt>
        <dd>
          {num(t.clientsOff)}
          <small>{pct(t.clients ? t.clientsOff / t.clients : 0)}</small>
        </dd>
      </div>
      <div>
        <dt>Circuitos afectados</dt>
        <dd>
          {t.circuitsOff}
          <small>
            {t.circuitsPlanned} prog. · {t.circuitsFault} avería
          </small>
        </dd>
      </div>
      <div>
        <dt>Reportes ciudadanos</dt>
        <dd>
          {num(t.reports)}
          <small>últimos 30 min</small>
        </dd>
      </div>
    </dl>
  );
}

/* ------------------------------ Leyenda ------------------------------ */

export function Legend() {
  return (
    <ul className="legend" aria-label="Leyenda">
      <li>
        <i className="sw st-on" /> Con luz
      </li>
      <li>
        <i className="sw st-planned" /> Corte programado
      </li>
      <li>
        <i className="sw st-fault" /> Sin luz (avería)
      </li>
      <li>
        <i className="sw st-restoring" /> Restableciendo
      </li>
      <li className="legend-ramp">
        <span>Provincia</span>
        <i className="ramp" aria-hidden="true" />
        <span className="ramp-labels">
          <span>con luz</span>
          <span>apagada</span>
        </span>
      </li>
    </ul>
  );
}

/* ------------------------------ Avisos ------------------------------- */

export function AlertsFeed({
  alerts,
  onSelectCircuit,
}: {
  alerts: Alert[];
  onSelectCircuit: (code: string) => void;
}) {
  if (alerts.length === 0) {
    return (
      <p className="empty">Todavía no hay avisos. Dale a reproducir para que avance el tiempo.</p>
    );
  }
  return (
    <ol className="alerts">
      {alerts.map((a) => (
        <li key={a.id} className={`alert lvl-${a.level}`}>
          <button
            type="button"
            disabled={!a.circuitCode}
            onClick={() => a.circuitCode && onSelectCircuit(a.circuitCode)}
          >
            <span className="alert-meta">
              <time>{formatRd(a.at)}</time>
              <ProvenanceTag value={a.provenance} />
            </span>
            <strong>{a.title}</strong>
            <span className="alert-body">{a.body}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ProvenanceTag({ value }: { value: Alert["provenance"] }) {
  return <span className={`tag prov-${value}`}>{PROVENANCE_LABEL[value]}</span>;
}

/* --------------------------- Ficha: circuito ------------------------- */

export function CircuitDetail({
  circuit,
  province,
  snapshot,
  timeline,
  onClose,
}: {
  circuit: Circuit;
  province: Province | undefined;
  snapshot: Snapshot;
  timeline: Timeline;
  onClose: () => void;
}) {
  const st = snapshot.circuits[circuit.code];
  const history = circuitHistory(timeline, circuit.code, snapshot.at).slice(-6).reverse();
  return (
    <article className="detail">
      <header>
        <div>
          <span className="eyebrow">
            {EDE_LABEL[circuit.ede]} · circuito clase {circuit.class}
          </span>
          <h3 className="code">{circuit.code}</h3>
          <p>
            {circuit.municipality}, {province?.name}
          </p>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Cerrar ficha">
          ×
        </button>
      </header>

      {st && (
        <div className={`status-banner st-${st.status}`}>
          <strong>{STATUS_LABEL[st.status]}</strong>
          {st.cause && <span>{st.cause}</span>}
        </div>
      )}

      <dl className="facts">
        <div>
          <dt>Clientes</dt>
          <dd>{num(circuit.clients)}</dd>
        </div>
        <div>
          <dt>Reportes (30 min)</dt>
          <dd>
            {st?.reports ?? 0}
            {st && st.status !== "on" && (
              <small>
                {st.confirmed ? "confirmado" : `faltan ${CONSENSUS_THRESHOLD - st.reports}`}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>Descartados</dt>
          <dd>
            {st?.discardedReports ?? 0}
            <small>filtro anti-abuso</small>
          </dd>
        </div>
      </dl>

      {circuit.zones.length > 0 && (
        <section>
          <h4>Zonas</h4>
          <p className="zones">
            {circuit.zones.slice(0, 14).join(", ")}
            {circuit.zones.length > 14 ? ` y ${circuit.zones.length - 14} más` : ""}.
          </p>
        </section>
      )}

      <section>
        <h4>Historial en este escenario</h4>
        {history.length === 0 ? (
          <p className="muted">Sin cortes hasta este momento.</p>
        ) : (
          <ol className="history">
            {history.map((h) => (
              <li key={h.id}>
                <span>
                  {formatRd(h.start)} → {formatRd(h.end, false)}
                </span>
                <span>{h.cause}</span>
                <ProvenanceTag value={h.provenance} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="source">
        <ProvenanceTag value={circuit.provenance} />
        <span>
          Fuente:{" "}
          {circuit.source.url ? (
            <a href={circuit.source.url} target="_blank" rel="noreferrer">
              {circuit.source.label}
            </a>
          ) : (
            circuit.source.label
          )}
          . Ubicación aproximada; clase de circuito simulada.
        </span>
      </footer>
    </article>
  );
}

/* --------------------------- Ficha: provincia ------------------------ */

export function ProvinceDetail({
  province,
  dataset,
  snapshot,
  onSelectCircuit,
  onClose,
}: {
  province: Province;
  dataset: Dataset;
  snapshot: Snapshot;
  onSelectCircuit: (code: string) => void;
  onClose: () => void;
}) {
  const ps = snapshot.provinces[province.id];
  const circuits = dataset.circuits
    .filter((c) => c.provinceId === province.id)
    .map((c) => ({ c, st: snapshot.circuits[c.code] }))
    .sort(
      (a, b) =>
        Number(a.st?.status === "on") - Number(b.st?.status === "on") || b.c.clients - a.c.clients,
    );
  return (
    <article className="detail">
      <header>
        <div>
          <span className="eyebrow">Provincia · {EDE_LABEL[province.ede]}</span>
          <h3>{province.name}</h3>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Cerrar ficha">
          ×
        </button>
      </header>
      <dl className="facts">
        <div>
          <dt>Sin luz</dt>
          <dd>{pct(ps?.ratioOff ?? 0)}</dd>
        </div>
        <div>
          <dt>Clientes sin luz</dt>
          <dd>{num(ps?.clientsOff ?? 0)}</dd>
        </div>
        <div>
          <dt>Circuitos</dt>
          <dd>
            {ps?.circuitsOff ?? 0}
            <small>de {circuits.length} afectados</small>
          </dd>
        </div>
      </dl>
      <ul className="circuit-list">
        {circuits.map(({ c, st }) => (
          <li key={c.code}>
            <button type="button" onClick={() => onSelectCircuit(c.code)}>
              <i className={`sw st-${st?.status ?? "on"}`} />
              <span className="code">{c.code}</span>
              <span className="muted">{c.municipality}</span>
              <span className="num">{num(c.clients)}</span>
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ----------------------------- Escenario ----------------------------- */

export function ScenarioInfo({ scenario }: { scenario: Scenario }) {
  return (
    <article className="scenario-info">
      <p className="lede">{scenario.summary}</p>
      <section>
        <h4>Hechos reales en los que se basa</h4>
        <ul className="facts-list">
          {scenario.facts.map((f) => (
            <li key={f.text}>
              <p>{f.text}</p>
              {f.source.url ? (
                <a href={f.source.url} target="_blank" rel="noreferrer">
                  {f.source.label}
                </a>
              ) : (
                <span>{f.source.label}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Qué es simulado</h4>
        <ul className="simulated-list">
          {scenario.simulatedParts.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
