/**
 * Premium cosmic portrait — Amy Girl / Amy Boy editorial illustration.
 * Nebula backdrop, golden rim light, constellation overlay, floating planets.
 * Not a generic avatar; lux Pixar-adjacent lighting in pure SVG.
 */

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
import "../design/amy-astro.css";

type Props = {
  childName: string;
  reducedMotion?: boolean;
  className?: string;
  /** Optional override; defaults to name-resolved Amy Girl / Amy Boy */
  variant?: AmyPortraitVariant;
};

export function AmyAstroCosmicPortrait({
  childName,
  reducedMotion = false,
  className,
  variant: variantProp,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );
  const isGirl = variant === "girl";

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[300px]",
        !reducedMotion && "amy-astro-float",
        className,
      )}
      data-testid="amy-astro-cosmic-portrait"
      data-portrait-variant={variant}
      role="img"
      aria-label={`${childName}'s cosmic portrait`}
    >
      <div
        className={cn(
          "absolute inset-[1%] rounded-full border border-[hsl(42_65%_68%/0.45)]",
          !reducedMotion && "amy-astro-orbit",
        )}
        style={{ transformOrigin: "center" }}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-[8%] rounded-full border border-dashed border-[hsl(42_55%_62%/0.32)]",
          !reducedMotion && "amy-astro-orbit-reverse",
        )}
        style={{ transformOrigin: "center" }}
        aria-hidden
      />

      {/* Floating planets */}
      <span
        className={cn(
          "pointer-events-none absolute left-[8%] top-[18%] h-2.5 w-2.5 rounded-full bg-[hsl(42_80%_62%)] shadow-[0_0_10px_hsl(42_90%_55%/0.7)]",
          !reducedMotion && "amy-astro-float",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute right-[12%] top-[28%] h-2 w-2 rounded-full bg-[hsl(210_70%_72%)] shadow-[0_0_8px_hsl(210_80%_60%/0.6)]",
          !reducedMotion && "amy-astro-float",
        )}
        style={{ animationDelay: "0.6s" }}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-[22%] right-[16%] h-1.5 w-1.5 rounded-full bg-[hsl(285_70%_72%)]",
          !reducedMotion && "amy-astro-float",
        )}
        style={{ animationDelay: "1.1s" }}
        aria-hidden
      />

      <svg
        className="absolute inset-[12%] h-[76%] w-[76%] amy-astro-pulse-glow drop-shadow-[0_0_32px_hsl(275_65%_48%/0.45)]"
        viewBox="0 0 400 400"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-sky`} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#3a1f66" />
            <stop offset="45%" stopColor="#12182e" />
            <stop offset="100%" stopColor="#05070e" />
          </radialGradient>
          <radialGradient id={`${uid}-neb`} cx="48%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.55" />
            <stop offset="30%" stopColor={isGirl ? "#e8a0ff" : "#8eb8ff"} stopOpacity="0.75" />
            <stop offset="65%" stopColor="#6b3fb8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0a0e1c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-skin`} x1="30%" y1="20%" x2="80%" y2="90%">
            <stop offset="0%" stopColor={isGirl ? "#f6d5c2" : "#e8c4a8"} />
            <stop offset="55%" stopColor={isGirl ? "#e8b89a" : "#d4a07e"} />
            <stop offset="100%" stopColor={isGirl ? "#c98a6a" : "#b07858"} />
          </linearGradient>
          <linearGradient id={`${uid}-hair`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop
              offset="0%"
              stopColor={isGirl ? "#2a1848" : "#1a1428"}
            />
            <stop
              offset="100%"
              stopColor={isGirl ? "#5a2d7a" : "#3a2848"}
            />
          </linearGradient>
          <linearGradient id={`${uid}-rim`} x1="10%" y1="0%" x2="95%" y2="100%">
            <stop offset="0%" stopColor="#fff1c4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c9a24a" stopOpacity="0.2" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="200" cy="200" r="198" fill={`url(#${uid}-sky)`} />
        <ellipse cx="200" cy="200" rx="150" ry="140" fill={`url(#${uid}-neb)`} />

        {/* Starfield */}
        <g fill="#f7f0dc" opacity="0.7">
          {[
            [48, 64],
            [86, 120],
            [320, 58],
            [350, 150],
            [60, 290],
            [310, 310],
            [180, 36],
            [250, 270],
            [120, 210],
            [280, 100],
            [100, 340],
            [340, 240],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 0.9} />
          ))}
        </g>

        {/* Constellation overlay behind child */}
        <g stroke="#f0d78a" strokeWidth="0.8" fill="none" opacity="0.4">
          <polyline points="70,160 110,130 150,150 190,120" />
          <polyline points="240,100 280,130 320,110 350,150" />
        </g>
        <g fill="#f0d78a" opacity="0.55">
          <circle cx="70" cy="160" r="1.6" />
          <circle cx="110" cy="130" r="1.3" />
          <circle cx="150" cy="150" r="1.4" />
          <circle cx="280" cy="130" r="1.5" />
          <circle cx="320" cy="110" r="1.2" />
        </g>

        {/* Child looking upward — editorial portrait */}
        <g filter={`url(#${uid}-soft)`}>
          {/* Shoulders / garment */}
          <ellipse
            cx="200"
            cy="318"
            rx="78"
            ry="42"
            fill={isGirl ? "url(#" + uid + "-hair)" : "#1e1638"}
            opacity="0.95"
          />
          <path
            d="M130 300c20-28 50-40 70-40s50 12 70 40v40H130z"
            fill={isGirl ? "#4a2870" : "#243056"}
          />
          {/* Gold collar accent */}
          <path
            d="M155 292c14-10 30-14 45-14s31 4 45 14"
            fill="none"
            stroke={`url(#${uid}-rim)`}
            strokeWidth="2"
            opacity="0.7"
          />

          {/* Neck */}
          <rect x="186" y="248" width="28" height="28" rx="10" fill={`url(#${uid}-skin)`} />

          {/* Head */}
          <ellipse cx="200" cy="198" rx="52" ry="58" fill={`url(#${uid}-skin)`} />

          {/* Hair */}
          {isGirl ? (
            <>
              <ellipse cx="200" cy="168" rx="58" ry="48" fill={`url(#${uid}-hair)`} />
              <path
                d="M145 190c-8 30-6 70 8 95 4-20 12-40 22-55-4-12-8-24-10-40z"
                fill={`url(#${uid}-hair)`}
              />
              <path
                d="M255 190c8 30 6 70-8 95-4-20-12-40-22-55 4-12 8-24 10-40z"
                fill={`url(#${uid}-hair)`}
              />
              {/* Soft bangs */}
              <path
                d="M155 175c15-28 40-38 45-38 5 0 30 10 45 38-18-8-32-10-45-10s-27 2-45 10z"
                fill={`url(#${uid}-hair)`}
              />
            </>
          ) : (
            <>
              <ellipse cx="200" cy="172" rx="54" ry="42" fill={`url(#${uid}-hair)`} />
              <path
                d="M148 195c2-30 20-52 52-52s50 22 52 52c-12-18-30-26-52-26s-40 8-52 26z"
                fill={`url(#${uid}-hair)`}
              />
            </>
          )}

          {/* Eyes looking upward */}
          <ellipse cx="180" cy="200" rx="7" ry="8" fill="#1a1230" />
          <ellipse cx="220" cy="200" rx="7" ry="8" fill="#1a1230" />
          <circle cx="182" cy="197" r="2.2" fill="#f5f0ff" />
          <circle cx="222" cy="197" r="2.2" fill="#f5f0ff" />
          {/* Soft smile */}
          <path
            d="M184 228c8 10 24 10 32 0"
            fill="none"
            stroke="#b07868"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Cheek warm light */}
          <ellipse cx="168" cy="218" rx="8" ry="5" fill="#f0a090" opacity="0.28" />
          <ellipse cx="232" cy="218" rx="8" ry="5" fill="#f0a090" opacity="0.28" />
        </g>

        {/* Golden rim light on face edge */}
        <ellipse
          cx="200"
          cy="198"
          rx="53"
          ry="59"
          fill="none"
          stroke={`url(#${uid}-rim)`}
          strokeWidth="2.6"
          opacity="0.75"
        />

        {/* Galaxy particles near shoulders */}
        <g fill="#ffe9b0" opacity="0.8">
          <circle cx="140" cy="280" r="1.2" />
          <circle cx="260" cy="275" r="1" />
          <circle cx="150" cy="250" r="0.8" />
          <circle cx="255" cy="255" r="0.9" />
        </g>
      </svg>
    </div>
  );
}
