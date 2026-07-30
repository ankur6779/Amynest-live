/**
 * North-Indian kundli — places every Vedic graha in its actual whole-sign house.
 * Never invents positions. Day Sky / incomplete charts disable the chart.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AMY_ASTRO_DISCLAIMER } from "../lib/branding";
import "../design/amy-astro.css";

export type KundliGrahaKey =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

export type KundliBody = {
  key: KundliGrahaKey | "rising";
  label: string;
  sign: string;
  /** Whole-sign house 1–12 from planetHouseMap. Required for chart placement. */
  house?: number | null;
  locked?: boolean;
  degreeLabel?: string;
  story?: string;
  retrograde?: boolean;
  combust?: boolean;
  nakshatra?: string | null;
};

type Props = {
  bodies: KundliBody[];
  /** When false, show Day Sky / incomplete explanation instead of chart. */
  canRenderKundli?: boolean;
  disabledReason?: string | null;
  reducedMotion?: boolean;
  className?: string;
  childName?: string;
  moonPhaseLabel?: string;
  lagnaSign?: string | null;
};

/** House 1 (Lagna) fixed at top; houses increase anti-clockwise. */
const HOUSE_CENTERS: Record<number, { x: number; y: number }> = {
  1: { x: 100, y: 36 },
  2: { x: 148, y: 52 },
  3: { x: 168, y: 100 },
  4: { x: 148, y: 148 },
  5: { x: 100, y: 164 },
  6: { x: 52, y: 148 },
  7: { x: 32, y: 100 },
  8: { x: 52, y: 52 },
  9: { x: 100, y: 72 },
  10: { x: 128, y: 100 },
  11: { x: 100, y: 128 },
  12: { x: 72, y: 100 },
};

const ABBR: Record<string, string> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
  rising: "As",
};

function offsetInHouse(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const r = 8;
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
}

export function AmyAstroNorthIndianKundli({
  bodies,
  canRenderKundli = true,
  disabledReason = null,
  reducedMotion = false,
  className,
  childName = "your child",
  moonPhaseLabel,
  lagnaSign = null,
}: Props) {
  const [focus, setFocus] = useState<string | null>(null);

  const grahas = bodies.filter(
    (b) =>
      b.key !== "rising" &&
      !b.locked &&
      typeof b.house === "number" &&
      b.house >= 1 &&
      b.house <= 12,
  );

  const byHouse = new Map<number, KundliBody[]>();
  for (const g of grahas) {
    const h = g.house as number;
    const list = byHouse.get(h) ?? [];
    list.push(g);
    byHouse.set(h, list);
  }

  const focused = bodies.find((b) => b.key === focus) ?? null;

  if (!canRenderKundli) {
    return (
      <section
        className={cn("amy-astro-glass amy-astro-breathe rounded-3xl p-4", className)}
        data-testid="amy-astro-kundli-disabled"
        aria-label="Janam Kundli unavailable"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.75)]">
          Janam Kundli
        </p>
        <h3 className="amy-astro-display mt-1 text-lg text-[hsl(42_70%_78%)]">Day Sky mode</h3>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(40_18%_94%/0.82)]">
          {disabledReason ??
            `Without an exact birth time and place we keep a meaningful Day Sky for ${childName}, but we do not draw a kundli or invent house placements.`}
        </p>
        <p className="mt-3 text-[10px] leading-snug text-[hsl(40_20%_96%/0.45)]">
          {AMY_ASTRO_DISCLAIMER}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("amy-astro-glass amy-astro-breathe rounded-3xl p-4", className)}
      data-testid="amy-astro-kundli"
      aria-label="Janam Kundli visualization"
    >
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.75)]">
            Janam Kundli
          </p>
          <h3 className="amy-astro-display mt-1 text-lg text-[hsl(42_70%_78%)]">
            North Indian chart
          </h3>
          {lagnaSign ? (
            <p className="mt-1 text-xs text-[hsl(42_60%_75%/0.85)]">Lagna · {lagnaSign}</p>
          ) : null}
        </div>
        <p className="max-w-[10rem] text-right text-[10px] leading-snug text-[hsl(40_20%_96%/0.45)]">
          {AMY_ASTRO_DISCLAIMER}
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(275_60%_40%/0.25),transparent_65%)]"
          aria-hidden
        />
        <svg
          viewBox="0 0 200 200"
          className={cn(
            "relative h-full w-full drop-shadow-[0_0_28px_hsl(42_80%_50%/0.3)]",
            !reducedMotion && "amy-astro-pulse-glow",
          )}
          role="img"
          aria-label="Diamond kundli with grahas in whole-sign houses"
        >
          <defs>
            <linearGradient id="kundli-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(42 90% 75%)" />
              <stop offset="100%" stopColor="hsl(42 55% 48%)" />
            </linearGradient>
          </defs>

          <polygon
            points="100,8 192,100 100,192 8,100"
            fill="hsl(230 40% 10% / 0.7)"
            stroke="url(#kundli-gold)"
            strokeWidth="1.5"
          />
          <polygon
            points="100,48 152,100 100,152 48,100"
            fill="none"
            stroke="url(#kundli-gold)"
            strokeWidth="1.1"
            opacity="0.9"
          />
          <line x1="100" y1="8" x2="100" y2="192" stroke="url(#kundli-gold)" strokeWidth="0.7" opacity="0.55" />
          <line x1="8" y1="100" x2="192" y2="100" stroke="url(#kundli-gold)" strokeWidth="0.7" opacity="0.55" />
          <line x1="8" y1="100" x2="100" y2="8" stroke="url(#kundli-gold)" strokeWidth="0.55" opacity="0.35" />
          <line x1="100" y1="8" x2="192" y2="100" stroke="url(#kundli-gold)" strokeWidth="0.55" opacity="0.35" />
          <line x1="192" y1="100" x2="100" y2="192" stroke="url(#kundli-gold)" strokeWidth="0.55" opacity="0.35" />
          <line x1="100" y1="192" x2="8" y2="100" stroke="url(#kundli-gold)" strokeWidth="0.55" opacity="0.35" />

          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
            const c = HOUSE_CENTERS[h]!;
            return (
              <text
                key={`h-${h}`}
                x={c.x}
                y={c.y - 12}
                textAnchor="middle"
                fontSize="6"
                fill="hsl(40 20% 96% / 0.35)"
              >
                {h}
              </text>
            );
          })}

          {Array.from(byHouse.entries()).flatMap(([house, list]) =>
            list.map((p, idx) => {
              const c = HOUSE_CENTERS[house]!;
              const { dx, dy } = offsetInHouse(idx, list.length);
              const active = focus === p.key;
              const abbr = ABBR[p.key] ?? p.label.slice(0, 2).toUpperCase();
              return (
                <g
                  key={p.key}
                  data-testid={`amy-astro-kundli-${p.key}`}
                  data-house={house}
                  className="cursor-pointer"
                  onClick={() => setFocus(active ? null : p.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFocus(active ? null : p.key);
                    }
                  }}
                  aria-label={`${p.label} in house ${house}, ${p.sign}`}
                >
                  <circle
                    cx={c.x + dx}
                    cy={c.y + dy}
                    r={active ? 11 : 9}
                    fill="hsl(230 40% 12% / 0.95)"
                    stroke="url(#kundli-gold)"
                    strokeWidth={active ? 1.6 : 1}
                  />
                  <text
                    x={c.x + dx}
                    y={c.y + dy + 2.8}
                    textAnchor="middle"
                    fontSize="6.5"
                    fill="hsl(42 80% 78%)"
                    fontWeight="700"
                  >
                    {abbr}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>

      {focused ? (
        <div
          className="amy-astro-enter mt-4 rounded-2xl border border-[hsl(42_50%_60%/0.3)] bg-black/30 p-4"
          data-testid="amy-astro-kundli-focus-card"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.75)]">
            {focused.label}
            {moonPhaseLabel && focused.key === "moon" ? ` · ${moonPhaseLabel}` : ""}
            {focused.retrograde ? " · Retrograde" : ""}
            {focused.combust ? " · Combust" : ""}
          </p>
          <p className="amy-astro-display mt-1 text-lg text-[hsl(42_75%_80%)]">
            {focused.locked
              ? "Waiting on birth time"
              : `${focused.sign}${
                  typeof focused.house === "number" ? ` · House ${focused.house}` : ""
                }${focused.degreeLabel ? ` · ${focused.degreeLabel}` : ""}`}
          </p>
          {focused.nakshatra ? (
            <p className="mt-1 text-xs text-[hsl(42_60%_75%/0.85)]">{focused.nakshatra}</p>
          ) : null}
          {focused.story ? (
            <p className="mt-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.82)]">
              {focused.story}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-[hsl(42_60%_75%)]"
            onClick={() => setFocus(null)}
          >
            Close planet card
          </button>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2" aria-label="Graha positions" data-testid="amy-astro-graha-list">
        {bodies
          .filter((b) => b.key !== "rising")
          .map((b) => (
            <li key={b.key}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                  focus === b.key
                    ? "border-[hsl(42_60%_65%/0.45)] bg-[hsl(42_40%_25%/0.25)]"
                    : "border-[hsl(42_50%_60%/0.15)] bg-black/20",
                )}
                onClick={() => setFocus(focus === b.key ? null : b.key)}
                data-testid={`amy-astro-graha-${b.key}`}
              >
                <span className="text-sm font-semibold text-[hsl(40_20%_96%/0.9)]">
                  {b.label}
                  {b.retrograde ? " (R)" : ""}
                </span>
                <span className="text-right text-xs text-[hsl(42_60%_75%/0.9)]">
                  {b.locked
                    ? "Needs birth time"
                    : `${b.sign}${
                        typeof b.house === "number" ? ` · H${b.house}` : ""
                      }${b.degreeLabel ? ` · ${b.degreeLabel}` : ""}`}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}
