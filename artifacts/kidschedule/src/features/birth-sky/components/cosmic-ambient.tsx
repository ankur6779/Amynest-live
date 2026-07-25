/**
 * Immersive cosmic background — intensity tiers for GPU budget.
 * shell = calm (default); full = ceremony overlays; static = reduced motion.
 */

import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  className?: string;
  reducedMotion?: boolean;
  showMeteor?: boolean;
  living?: boolean;
  /** shell = fewer layers; full = rich; static = no motion layers */
  intensity?: "shell" | "full" | "static";
};

export function AmyAstroCosmicAmbient({
  className,
  reducedMotion = false,
  showMeteor = false,
  living = true,
  intensity = "shell",
}: Props) {
  const mode = reducedMotion || !living ? "static" : intensity;
  const rich = mode === "full";
  const calm = mode === "shell";

  return (
    <div
      className={cn(
        "amy-astro-ambient",
        rich && "amy-astro-camera-drift",
        className,
      )}
      aria-hidden
      data-intensity={mode}
    >
      <div className="amy-astro-nebula" />
      {rich ? (
        <div
          className="pointer-events-none absolute inset-[-30%] opacity-30 amy-astro-galaxy-drift"
          style={{
            background:
              "conic-gradient(from 20deg, transparent, hsl(275 60% 50% / 0.15), transparent 40%, hsl(42 70% 50% / 0.1), transparent 70%)",
          }}
        />
      ) : null}
      <div className="amy-astro-starfield" />
      {rich || calm ? (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-[42%] h-[min(72vw,420px)] w-[min(72vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(42_50%_70%/0.08)]",
            rich && "amy-astro-orbit",
          )}
          style={{
            boxShadow:
              "0 0 40px hsl(275 60% 50% / 0.08), inset 0 0 60px hsl(42 70% 50% / 0.04)",
          }}
        >
          {rich ? (
            <>
              <span className="absolute left-[8%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[hsl(42_90%_75%)] shadow-[0_0_10px_hsl(42_90%_70%/0.8)]" />
              <span className="absolute right-[12%] top-[22%] h-1 w-1 rounded-full bg-[hsl(220_80%_80%)] shadow-[0_0_8px_hsl(220_80%_70%/0.7)]" />
            </>
          ) : null}
        </div>
      ) : null}
      <div className={cn("amy-astro-aurora", !rich && !calm && "opacity-40")} />
      {rich ? <div className="amy-astro-particle-field" /> : null}
      {showMeteor && rich ? (
        <div
          className="amy-astro-meteor absolute left-[10%] top-[8%] h-px w-24 origin-left bg-gradient-to-r from-transparent via-[hsl(42_90%_80%)] to-transparent opacity-0"
          style={{ boxShadow: "0 0 8px hsl(42 90% 70% / 0.8)" }}
        />
      ) : null}
    </div>
  );
}
