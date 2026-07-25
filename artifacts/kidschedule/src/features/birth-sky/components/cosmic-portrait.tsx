/**
 * Animated child cosmic portrait — silhouette filled with living galaxy.
 */

import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  childName: string;
  reducedMotion?: boolean;
  className?: string;
};

export function AmyAstroCosmicPortrait({
  childName,
  reducedMotion = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[280px]",
        !reducedMotion && "amy-astro-float",
        className,
      )}
      data-testid="amy-astro-cosmic-portrait"
      role="img"
      aria-label={`${childName}'s cosmic portrait`}
    >
      {/* Orbital rings */}
      <div
        className={cn(
          "absolute inset-[2%] rounded-full border border-[hsl(42_60%_65%/0.35)]",
          !reducedMotion && "amy-astro-orbit",
        )}
        style={{ transformOrigin: "center" }}
      />
      <div
        className={cn(
          "absolute inset-[10%] rounded-full border border-dashed border-[hsl(42_50%_60%/0.25)]",
          !reducedMotion && "amy-astro-orbit-reverse",
        )}
        style={{ transformOrigin: "center" }}
      />
      <div className="absolute inset-[18%] rounded-full border border-[hsl(275_50%_60%/0.2)]" />

      {/* Galaxy core silhouette */}
      <div className="absolute inset-[22%] overflow-hidden rounded-full amy-astro-pulse-glow">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 45% 40%, hsl(275 70% 55% / 0.95), hsl(248 60% 35% / 0.9) 40%, hsl(230 50% 12% / 0.95) 75%)",
          }}
        />
        {!reducedMotion ? (
          <div
            className="absolute inset-[-20%] opacity-70 amy-astro-orbit"
            style={{
              background:
                "conic-gradient(from 40deg, transparent, hsl(42 80% 70% / 0.25), transparent 40%, hsl(275 80% 70% / 0.3), transparent 70%)",
              transformOrigin: "center",
            }}
          />
        ) : null}
        {/* Profile silhouette mask via CSS shape */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <mask id="aa-profile-mask">
              <rect width="200" height="200" fill="black" />
              <path
                d="M108 36c-18 0-34 16-34 40 0 12 5 22 13 29-11 5-19 16-19 29v18h82v-18c0-13-8-24-19-29 8-7 13-17 13-29 0-24-16-40-36-40z"
                fill="white"
              />
            </mask>
          </defs>
          <rect
            width="200"
            height="200"
            fill="url(#unused)"
            mask="url(#aa-profile-mask)"
            style={{
              fill: "url(#aaPortraitNebula)",
            }}
          />
          <defs>
            <radialGradient id="aaPortraitNebula" cx="48%" cy="42%" r="55%">
              <stop offset="0%" stopColor="hsl(40 90% 92%)" stopOpacity="0.55" />
              <stop offset="35%" stopColor="hsl(275 80% 70%)" stopOpacity="0.9" />
              <stop offset="70%" stopColor="hsl(248 70% 40%)" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(230 50% 10%)" stopOpacity="1" />
            </radialGradient>
          </defs>
          <path
            d="M108 36c-18 0-34 16-34 40 0 12 5 22 13 29-11 5-19 16-19 29v18h82v-18c0-13-8-24-19-29 8-7 13-17 13-29 0-24-16-40-36-40z"
            fill="url(#aaPortraitNebula)"
            opacity="0.95"
          />
          <circle cx="108" cy="72" r="14" fill="hsl(40 90% 95% / 0.25)" />
          <circle cx="108" cy="110" r="5" fill="hsl(42 95% 70% / 0.85)" />
        </svg>
      </div>

      {/* Planet beads */}
      <span className="absolute left-[8%] top-[28%] h-2.5 w-2.5 rounded-full bg-[hsl(42_70%_55%)] shadow-[0_0_10px_hsl(42_90%_60%/0.8)]" />
      <span className="absolute right-[10%] top-[40%] h-3 w-3 rounded-full bg-[hsl(275_50%_55%)] shadow-[0_0_12px_hsl(275_70%_55%/0.7)]" />
      <span className="absolute bottom-[18%] left-[22%] h-2 w-2 rounded-full bg-[hsl(210_50%_65%)]" />
    </div>
  );
}
