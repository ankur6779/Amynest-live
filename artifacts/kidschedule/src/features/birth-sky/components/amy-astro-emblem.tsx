/**
 * Animated Amy Astro cosmic emblem — orbits, planets, sacred geometry, nebula core.
 * Brand mark for welcome / formation / reduced-motion hero fallback.
 */

import { cn } from "@/lib/utils";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import "../design/amy-astro.css";

type Props = {
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  /** Use photographic brand asset behind SVG rings */
  showPhoto?: boolean;
};

export function AmyAstroEmblem({
  size = 160,
  className,
  reducedMotion = false,
  showPhoto = false,
}: Props) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center amy-astro-pulse-glow",
        !reducedMotion && "amy-astro-float",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={AMY_ASTRO_PRODUCT_NAME}
      data-testid="amy-astro-emblem"
    >
      {showPhoto ? (
        <img
          src="/amy-astro/brand-emblem.png"
          alt=""
          className="absolute inset-[12%] h-[76%] w-[76%] rounded-full object-cover opacity-90"
          draggable={false}
        />
      ) : null}

      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="relative z-[1]"
        aria-hidden
      >
        <defs>
          <radialGradient id="aa-nebula" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="hsl(275 70% 65%)" stopOpacity="0.95" />
            <stop offset="45%" stopColor="hsl(248 65% 45%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(230 50% 12%)" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="aa-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(42 90% 78%)" />
            <stop offset="50%" stopColor="hsl(42 70% 55%)" />
            <stop offset="100%" stopColor="hsl(40 50% 78%)" />
          </linearGradient>
          <filter id="aa-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer orbits */}
        <g
          className={cn(!reducedMotion && "amy-astro-orbit")}
          style={{ transformOrigin: "100px 100px" }}
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="url(#aa-gold)"
            strokeWidth="0.8"
            opacity="0.55"
          />
          <circle cx="100" cy="14" r="2.2" fill="url(#aa-gold)" />
          <circle cx="178" cy="72" r="4" fill="hsl(42 60% 55%)" opacity="0.9" />
          <circle cx="155" cy="155" r="3" fill="hsl(275 50% 60%)" opacity="0.85" />
        </g>

        <g
          className={cn(!reducedMotion && "amy-astro-orbit-reverse")}
          style={{ transformOrigin: "100px 100px" }}
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke="url(#aa-gold)"
            strokeWidth="0.6"
            opacity="0.4"
            strokeDasharray="2 6"
          />
          <circle cx="168" cy="100" r="3.5" fill="hsl(230 40% 55%)" />
          <ellipse
            cx="42"
            cy="120"
            rx="5"
            ry="3.2"
            fill="none"
            stroke="hsl(42 70% 65%)"
            strokeWidth="1"
            opacity="0.8"
          />
        </g>

        <circle
          cx="100"
          cy="100"
          r="48"
          fill="none"
          stroke="url(#aa-gold)"
          strokeWidth="1.1"
          opacity="0.7"
        />

        {/* Cosmic child silhouette core */}
        {!showPhoto ? (
          <g filter="url(#aa-soft)">
            <path
              d="M100 52c-14 0-26 12-26 32 0 10 4 18 10 24-8 4-14 12-14 22v8h60v-8c0-10-6-18-14-22 6-6 10-14 10-24 0-20-12-32-26-32z"
              fill="url(#aa-nebula)"
              opacity="0.95"
            />
            <circle cx="100" cy="78" r="10" fill="hsl(40 90% 90% / 0.35)" />
            <circle cx="100" cy="108" r="4" fill="hsl(42 90% 70% / 0.8)" />
          </g>
        ) : null}

        {/* Seed of Life mark */}
        <g transform="translate(100 168)" opacity="0.85">
          <circle r="7" fill="none" stroke="url(#aa-gold)" strokeWidth="0.7" />
          <circle cx="0" cy="-4" r="3.5" fill="none" stroke="url(#aa-gold)" strokeWidth="0.5" />
          <circle cx="3.5" cy="2" r="3.5" fill="none" stroke="url(#aa-gold)" strokeWidth="0.5" />
          <circle cx="-3.5" cy="2" r="3.5" fill="none" stroke="url(#aa-gold)" strokeWidth="0.5" />
        </g>

        {/* North star */}
        <path
          d="M100 8 L102 14 L108 14 L103.5 17.5 L105.5 23.5 L100 20 L94.5 23.5 L96.5 17.5 L92 14 L98 14 Z"
          fill="url(#aa-gold)"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
