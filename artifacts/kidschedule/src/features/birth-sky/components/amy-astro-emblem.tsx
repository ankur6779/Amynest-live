/**
 * Flagship Amy Astro emblem — luxury galaxy core, golden orbits,
 * constellation weave, child silhouette. OLED-safe gold/violet/indigo.
 * Scales cleanly from 24px → 96px+.
 */

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import "../design/amy-astro.css";

type Props = {
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  /** @deprecated ignored — emblem is always the animated SVG brand */
  showPhoto?: boolean;
  interactive?: boolean;
};

export function AmyAstroEmblem({
  size = 160,
  className,
  reducedMotion = false,
  interactive,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [burst, setBurst] = useState(false);
  const canInteract = interactive ?? size >= 44;
  const fine = size >= 48;

  const onActivate = () => {
    if (!canInteract || reducedMotion) return;
    setBurst(true);
    window.setTimeout(() => setBurst(false), 480);
  };

  return (
    <div
      className={cn(
        "amy-astro-emblem relative inline-flex items-center justify-center",
        !reducedMotion && "amy-astro-emblem-live",
        canInteract && !reducedMotion && "amy-astro-emblem-interactive",
        burst && "amy-astro-emblem-burst",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={AMY_ASTRO_PRODUCT_NAME}
      data-testid="amy-astro-emblem"
      tabIndex={canInteract ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (!canInteract) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {/* Soft breathing aura — kept under reduced motion */}
      <div
        className={cn(
          "pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,hsl(42_90%_62%/0.28),hsl(275_70%_45%/0.12)_45%,transparent_70%)]",
          !reducedMotion ? "amy-astro-emblem-aura" : "opacity-80",
        )}
        aria-hidden
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="relative z-[1] overflow-visible"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-core`} cx="42%" cy="36%" r="62%">
            <stop offset="0%" stopColor="hsl(42 100% 92%)" stopOpacity="0.95" />
            <stop offset="18%" stopColor="hsl(42 90% 68%)" stopOpacity="0.9" />
            <stop offset="42%" stopColor="hsl(285 85% 62%)" stopOpacity="1" />
            <stop offset="72%" stopColor="hsl(248 72% 32%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(230 55% 6%)" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(42 98% 88%)" />
            <stop offset="40%" stopColor="hsl(42 82% 56%)" />
            <stop offset="100%" stopColor="hsl(38 60% 78%)" />
          </linearGradient>
          <linearGradient id={`${uid}-shimmer`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="hsl(42 90% 80%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(42 100% 92%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(42 90% 80%)" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={`${uid}-child`}>
            <path d="M100 52c-14 0-26 12-26 30 0 10 4 18 11 23-10 4-17 14-17 26v12h64V131c0-12-7-22-17-26 7-5 11-13 11-23 0-18-12-30-26-30z" />
          </clipPath>
        </defs>

        {/* Outer golden orbit + planets */}
        <g
          className={cn(!reducedMotion && "amy-astro-emblem-orbit")}
          style={{ transformOrigin: "100px 100px" }}
        >
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth={fine ? 1.5 : 1.8}
            opacity="0.88"
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={`url(#${uid}-shimmer)`}
            strokeWidth="2.2"
            opacity="0.55"
            className={cn(!reducedMotion && "amy-astro-emblem-shimmer-stroke")}
          />
          <circle cx="100" cy="8" r="2.8" fill={`url(#${uid}-gold)`} />
          <circle cx="186" cy="64" r="3.6" fill="hsl(42 70% 58%)" opacity="0.95" />
          <circle cx="168" cy="172" r="2.5" fill="hsl(285 60% 72%)" opacity="0.92" />
          <circle cx="26" cy="142" r="2" fill="hsl(210 65% 78%)" opacity="0.88" />
          <circle cx="34" cy="48" r="1.5" fill="hsl(42 90% 80%)" opacity="0.8" />
        </g>

        {/* Inner constellation counter-orbit */}
        <g
          className={cn(!reducedMotion && "amy-astro-emblem-orbit-rev")}
          style={{ transformOrigin: "100px 100px" }}
        >
          <circle
            cx="100"
            cy="100"
            r="74"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth="0.9"
            opacity="0.4"
            strokeDasharray="1.2 6"
          />
          <polyline
            points="38,88 52,66 74,74 92,52 118,60"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth="0.65"
            opacity="0.65"
          />
          {[
            [38, 88],
            [52, 66],
            [74, 74],
            [92, 52],
            [118, 60],
            [158, 96],
            [148, 138],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i % 2 === 0 ? 1.35 : 1.05}
              fill={`url(#${uid}-gold)`}
              opacity="0.9"
            />
          ))}
        </g>

        {/* Mid ring */}
        <circle
          cx="100"
          cy="100"
          r="56"
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeWidth="1.1"
          opacity="0.55"
        />

        {/* Galaxy core + child silhouette (integrated) */}
        <g
          filter={`url(#${uid}-glow)`}
          className={cn(!reducedMotion && "amy-astro-emblem-pulse")}
        >
          <circle cx="100" cy="100" r="47" fill={`url(#${uid}-core)`} />
          <ellipse cx="88" cy="86" rx="22" ry="16" fill="hsl(42 95% 90% / 0.18)" />
          <g clipPath={`url(#${uid}-child)`}>
            <rect x="54" y="48" width="92" height="110" fill={`url(#${uid}-core)`} />
            <circle cx="92" cy="78" r="1.1" fill="hsl(42 95% 92%)" opacity="0.85" />
            <circle cx="108" cy="92" r="0.9" fill="hsl(42 95% 92%)" opacity="0.7" />
            <circle cx="100" cy="108" r="1" fill="hsl(285 80% 88%)" opacity="0.75" />
            <polyline
              points="86,86 98,98 112,92"
              fill="none"
              stroke="hsl(42 90% 80%)"
              strokeWidth="0.6"
              opacity="0.55"
            />
          </g>
          <path
            d="M100 52c-14 0-26 12-26 30 0 10 4 18 11 23-10 4-17 14-17 26v12h64V131c0-12-7-22-17-26 7-5 11-13 11-23 0-18-12-30-26-30z"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth="1.4"
            opacity="0.85"
          />
          {/* Heart-star spark at chest */}
          <circle cx="100" cy="118" r="2.6" fill="hsl(42 95% 72%)" opacity="0.95" />
        </g>

        {/* Tiny orbit particles */}
        {!reducedMotion ? (
          <g
            className="amy-astro-emblem-orbit"
            style={{ transformOrigin: "100px 100px" }}
            opacity="0.95"
          >
            <circle cx="100" cy="22" r="1.3" fill="hsl(42 100% 92%)" />
            <circle cx="154" cy="40" r="0.95" fill="hsl(42 85% 75%)" />
            <circle cx="48" cy="44" r="0.8" fill="hsl(40 90% 90%)" />
            <circle cx="178" cy="118" r="0.7" fill="hsl(285 70% 80%)" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
