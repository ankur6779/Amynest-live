/**
 * Cinematic North-Indian kundli — glow, aspect pulse, planet focus cards.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AMY_ASTRO_DISCLAIMER } from "../lib/branding";
import "../design/amy-astro.css";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type KundliBody = {
  key: "sun" | "moon" | "rising";
  label: string;
  sign: string;
  locked?: boolean;
  degreeLabel?: string;
  story?: string;
};

type Props = {
  bodies: KundliBody[];
  reducedMotion?: boolean;
  className?: string;
  childName?: string;
  moonPhaseLabel?: string;
};

function signIndex(sign: string): number {
  const i = SIGNS.indexOf(sign as (typeof SIGNS)[number]);
  return i >= 0 ? i : 0;
}

const HOUSE_CENTERS: Array<{ x: number; y: number }> = [
  { x: 100, y: 36 },
  { x: 148, y: 52 },
  { x: 168, y: 100 },
  { x: 148, y: 148 },
  { x: 100, y: 164 },
  { x: 52, y: 148 },
  { x: 32, y: 100 },
  { x: 52, y: 52 },
  { x: 100, y: 72 },
  { x: 128, y: 100 },
  { x: 100, y: 128 },
  { x: 72, y: 100 },
];

const DEFAULT_STORY: Record<KundliBody["key"], string> = {
  sun: "You may notice daylight themes — vitality, pride, creative heat — showing up when they feel seen.",
  moon: "The moments when they feel safest often reveal lunar weather: comfort, belonging, emotional tide.",
  rising: "Rising is the soft doorway — how a room may first meet them. Optional poetry, never a script.",
};

export function AmyAstroNorthIndianKundli({
  bodies,
  reducedMotion = false,
  className,
  childName = "your child",
  moonPhaseLabel,
}: Props) {
  const [focus, setFocus] = useState<KundliBody["key"] | null>(null);
  const placements = bodies
    .filter((b) => !b.locked && b.sign && b.sign !== "—")
    .map((b) => ({ ...b, house: signIndex(b.sign) }));
  const focused = bodies.find((b) => b.key === focus) ?? null;

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
            Living North Indian chart
          </h3>
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
          aria-label="Diamond kundli with interactive planet markers"
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

          {placements.length >= 2 &&
            placements.map((a, i) =>
              placements.slice(i + 1).map((b) => {
                const ca = HOUSE_CENTERS[a.house]!;
                const cb = HOUSE_CENTERS[b.house]!;
                const lit =
                  !focus || focus === a.key || focus === b.key;
                return (
                  <line
                    key={`${a.key}-${b.key}`}
                    x1={ca.x}
                    y1={ca.y}
                    x2={cb.x}
                    y2={cb.y}
                    stroke="hsl(275 60% 70% / 0.55)"
                    strokeWidth="0.9"
                    strokeDasharray="2 3"
                    className={cn(
                      lit && !reducedMotion && "amy-astro-aspect-pulse",
                      !lit && "opacity-20",
                    )}
                  />
                );
              }),
            )}

          {placements.map((p) => {
            const c = HOUSE_CENTERS[p.house]!;
            const active = focus === p.key;
            return (
              <g
                key={p.key}
                data-testid={`amy-astro-kundli-${p.key}`}
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
                aria-label={`${p.label} in ${p.sign}`}
              >
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={active ? 14 : 11}
                  fill="hsl(230 40% 12% / 0.95)"
                  stroke="url(#kundli-gold)"
                  strokeWidth={active ? 1.6 : 1}
                />
                <text
                  x={c.x}
                  y={c.y + 3.5}
                  textAnchor="middle"
                  fontSize="7"
                  fill="hsl(42 80% 78%)"
                  fontWeight="700"
                >
                  {p.label.slice(0, 2).toUpperCase()}
                </text>
              </g>
            );
          })}
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
          </p>
          <p className="amy-astro-display mt-1 text-lg text-[hsl(42_75%_80%)]">
            {focused.locked ? "Waiting on birth time" : focused.sign}
            {focused.degreeLabel ? ` · ${focused.degreeLabel}` : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.82)]">
            {focused.story ??
              DEFAULT_STORY[focused.key].replace("they", childName)}
          </p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-[hsl(42_60%_75%)]"
            onClick={() => setFocus(null)}
          >
            Close planet card
          </button>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2" aria-label="Graha positions">
        {bodies.map((b) => (
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
              </span>
              <span className="text-right text-xs text-[hsl(42_60%_75%/0.9)]">
                {b.locked
                  ? "Needs birth time"
                  : `${b.sign}${b.degreeLabel ? ` · ${b.degreeLabel}` : ""}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
