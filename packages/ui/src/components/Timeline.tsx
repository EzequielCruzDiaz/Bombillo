import { formatRd, MINUTE } from "@bombillo/domain";

type Props = {
  start: number;
  end: number;
  stepMinutes: number;
  at: number;
  playing: boolean;
  speed: 1 | 4;
  onChange: (at: number) => void;
  onTogglePlay: () => void;
  onToggleSpeed: () => void;
};

/** Control de reproducción del escenario: avanza en pasos de `stepMinutes`. */
export function Timeline({ start, end, stepMinutes, at, playing, speed, ...on }: Props) {
  const steps = Math.round((end - start) / (stepMinutes * MINUTE));
  const index = Math.round((at - start) / (stepMinutes * MINUTE));
  const days = Math.round((end - start) / (24 * 60 * MINUTE));

  return (
    <div className="timeline">
      <button
        type="button"
        className="play"
        onClick={on.onTogglePlay}
        aria-label={playing ? "Pausar" : "Reproducir"}
      >
        {playing ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3" y="2" width="3.5" height="12" rx="1" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2.5v11a.6.6 0 0 0 .9.5l9-5.5a.6.6 0 0 0 0-1l-9-5.5a.6.6 0 0 0-.9.5z" />
          </svg>
        )}
      </button>
      <div className="track">
        <div className="clock" aria-live="polite">
          <span className="clock-time">{formatRd(at)}</span>
          <span className="clock-range">
            {days >= 1 ? `${days} ${days === 1 ? "día" : "días"} · ` : ""}paso de {stepMinutes} min
          </span>
        </div>
        <input
          id="timeline-range"
          type="range"
          min={0}
          max={steps}
          value={index}
          aria-label="Momento del escenario"
          aria-valuetext={formatRd(at)}
          onChange={(e) => on.onChange(start + Number(e.target.value) * stepMinutes * MINUTE)}
        />
      </div>
      <button
        type="button"
        className="speed"
        onClick={on.onToggleSpeed}
        aria-label="Cambiar velocidad"
      >
        {speed}×
      </button>
    </div>
  );
}
