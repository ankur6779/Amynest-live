/**
 * TEMPORARY / current Sky map visual — abstract instrument SVG (Pack 4 Part 3).
 * Implements SkyMapRendererPort. Replace via getSkyMapRenderer() without
 * changing SkySegmentVM, snapshot hydration, or Dashboard contracts.
 */

import { useEffect, useRef } from "react";
import type {
  SkyMapRenderer,
  SkyMapRendererProps,
} from "../../domain/ports/sky-map-renderer-port";
import { cn } from "@/lib/utils";

function polar(angleNorm: number, r: number, cx = 120, cy = 120) {
  const a = angleNorm * Math.PI * 2 - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function InstrumentSvgSkyMap({
  model,
  selectedBody,
  onSelect,
  onInteractive,
  reducedMotion,
}: SkyMapRendererProps) {
  const ready = useRef(false);

  useEffect(() => {
    if (ready.current) return;
    ready.current = true;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => onInteractive());
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [onInteractive]);

  const selectable = model.markers.filter((m) => m.selectable);
  const links = selectable.slice(0, -1).map((m, i) => {
    const a = polar(m.angleNorm, 78);
    const b = polar(selectable[i + 1]!.angleNorm, 78);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${m.key}-${selectable[i + 1]!.key}` };
  });

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(222_45%_10%)]"
      data-testid="birth-sky-map"
      data-sky-renderer="instrument_svg"
      data-sky-interactive="true"
    >
      <svg
        viewBox="0 0 240 240"
        className="mx-auto block h-56 w-full max-w-sm touch-none"
        role="img"
        aria-label={model.mapAriaLabel}
      >
        <circle
          cx="120"
          cy="120"
          r="96"
          fill="none"
          stroke="hsla(40,20%,96%,0.12)"
          strokeWidth="1"
        />
        <path
          d="M24 150c30-18 60-27 96-27s66 9 96 27"
          fill="none"
          stroke="hsla(40,30%,80%,0.35)"
          strokeWidth="1.5"
        />
        {!reducedMotion
          ? links.map((l) => (
              <line
                key={l.key}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="hsla(40,20%,96%,0.18)"
                strokeWidth="1"
              />
            ))
          : null}
        {model.markers.map((m) => {
          const p = polar(m.angleNorm, m.locked ? 62 : 78);
          const selected = selectedBody === m.key;
          return (
            <g key={m.key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={selected ? 9 : 7}
                fill={m.locked ? "hsla(40,20%,96%,0.15)" : "hsla(40,30%,88%,0.92)"}
                stroke={selected ? "hsl(170 40% 60%)" : "transparent"}
                strokeWidth="2"
                opacity={m.locked ? 0.45 : 1}
                className={m.selectable ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (m.selectable) onSelect(m.key);
                }}
                data-testid={`birth-sky-map-marker-${m.key}`}
              />
              <text
                x={p.x}
                y={p.y + 18}
                textAnchor="middle"
                fill="hsla(40,20%,96%,0.7)"
                fontSize="9"
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {model.markers.map((m) => (
          <li key={m.key}>
            {m.label}: {m.locked ? "locked" : m.sign}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {model.markers.map((m) => (
          <button
            key={`btn-${m.key}`}
            type="button"
            disabled={!m.selectable}
            onClick={() => onSelect(m.key)}
            className={cn(
              "min-h-10 rounded-full border px-3 text-xs font-semibold",
              selectedBody === m.key
                ? "border-[hsl(170_40%_50%/0.6)] bg-white/10"
                : "border-white/12",
              !m.selectable && "opacity-45",
            )}
            data-testid={`birth-sky-map-select-${m.key}`}
          >
            {m.label}
            {m.locked ? " · Locked" : ` · ${m.sign}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function createInstrumentSvgSkyMapRenderer(): SkyMapRenderer {
  return {
    rendererId: "instrument_svg_v1",
    isTemporaryRenderer: true,
    Component: InstrumentSvgSkyMap,
  };
}
