/**
 * Cinematic reveal ceremony — 8–12s emotional arc.
 * Skippable after first view. Reduced motion: brief fade.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AmyAstroCosmicPortrait } from "./cosmic-portrait";
import {
  AMY_ASTRO_PRODUCT_NAME,
  AMY_ASTRO_TAGLINE,
} from "../lib/branding";
import {
  hasSeenRevealCeremony,
  markRevealCeremonySeen,
} from "../lib/ceremony-storage";
import { useFocusTrap } from "../lib/focus-trap";
import "../design/amy-astro.css";

export type CeremonyPhase =
  | "void"
  | "stars"
  | "constellation"
  | "nebula"
  | "planets"
  | "geometry"
  | "silhouette"
  | "amy_voice"
  | "tagline"
  | "done";

const PHASE_AT_MS: Array<{ at: number; phase: CeremonyPhase }> = [
  { at: 0, phase: "void" },
  { at: 900, phase: "stars" },
  { at: 2200, phase: "constellation" },
  { at: 3800, phase: "nebula" },
  { at: 5200, phase: "planets" },
  { at: 6600, phase: "geometry" },
  { at: 7800, phase: "silhouette" },
  { at: 9000, phase: "amy_voice" },
  { at: 10200, phase: "tagline" },
  { at: 11200, phase: "done" },
];

/** Reduced motion: still deliver brand + signature + identity — no empty wait. */
const REDUCED_DONE_MS = 2800;

type Props = {
  profileId: string;
  childName: string;
  tagline: string;
  reducedMotion?: boolean;
  onComplete: () => void;
};

function phaseAt(ms: number): CeremonyPhase {
  let phase: CeremonyPhase = "void";
  for (const step of PHASE_AT_MS) {
    if (ms >= step.at) phase = step.phase;
  }
  return phase;
}

export function AmyAstroCinematicRevealCeremony({
  profileId,
  childName,
  tagline,
  reducedMotion = false,
  onComplete,
}: Props) {
  const canSkip = useMemo(() => hasSeenRevealCeremony(profileId), [profileId]);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const phase = finished ? "done" : phaseAt(elapsed);

  const skip = () => {
    if (!canSkip && !reducedMotion && elapsed < 2500) return;
    setFinished(true);
    markRevealCeremonySeen(profileId);
    onComplete();
  };

  useFocusTrap(rootRef, !finished && phase !== "done", () => {
    if (canSkip || reducedMotion || elapsed > 2500) skip();
  });

  useEffect(() => {
    if (finished) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const ms = now - start;
      setElapsed(ms);
      const doneAt = reducedMotion ? REDUCED_DONE_MS : 11200;
      if (ms >= doneAt) {
        setFinished(true);
        markRevealCeremonySeen(profileId);
        onComplete();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finished, onComplete, profileId, reducedMotion]);

  if (finished || phase === "done") return null;

  const showStars = reducedMotion || elapsed >= 900;
  const showConstellation = reducedMotion || elapsed >= 2200;
  const showNebula = reducedMotion || elapsed >= 3800;
  const showPlanets = reducedMotion || elapsed >= 5200;
  const showGeometry = reducedMotion || elapsed >= 6600;
  const showSilhouette = reducedMotion || elapsed >= 7800;
  const showVoice = reducedMotion || elapsed >= 9000;
  const showTagline = reducedMotion || elapsed >= 10200;

  return (
    <div
      ref={rootRef}
      className="amy-astro-root fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      data-testid="amy-astro-reveal-ceremony"
      data-phase={reducedMotion ? "tagline" : phase}
      role="dialog"
      aria-modal="true"
      aria-label="Cosmic blueprint forming"
      tabIndex={-1}
    >
      {/* Deep void */}
      <div className="absolute inset-0 bg-[hsl(228_55%_3%)]" />

      {/* Stars emerge */}
      <div
        className={cn(
          "amy-astro-starfield absolute inset-0 transition-opacity duration-1000",
          showStars ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Constellation lines */}
      <svg
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000",
          showConstellation ? "opacity-70" : "opacity-0",
        )}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <g
          stroke="hsl(42 70% 70%)"
          strokeWidth="0.12"
          fill="none"
          className={cn(!reducedMotion && showConstellation && "amy-astro-constellation-draw")}
        >
          <polyline points="18,22 28,30 22,42 34,48" />
          <polyline points="62,18 72,28 80,22 88,36" />
          <polyline points="40,60 52,68 48,80 60,86" />
        </g>
        <g fill="hsl(42 90% 80%)">
          <circle cx="18" cy="22" r="0.4" />
          <circle cx="28" cy="30" r="0.35" />
          <circle cx="72" cy="28" r="0.45" />
          <circle cx="52" cy="68" r="0.4" />
        </g>
      </svg>

      {/* Nebula bloom */}
      <div
        className={cn(
          "absolute inset-[-10%] transition-opacity duration-[1400ms]",
          showNebula ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 45%, hsl(275 70% 42% / 0.45), transparent 60%), radial-gradient(ellipse 40% 35% at 70% 60%, hsl(230 70% 40% / 0.35), transparent 55%)",
        }}
        aria-hidden
      />

      {/* Orbiting planets */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          showPlanets ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "relative h-[min(72vw,320px)] w-[min(72vw,320px)] rounded-full border border-[hsl(42_60%_65%/0.25)]",
            !reducedMotion && "amy-astro-orbit",
          )}
        >
          <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(42_80%_60%)] shadow-[0_0_16px_hsl(42_90%_60%)]" />
          <span className="absolute bottom-[12%] right-[8%] h-2.5 w-2.5 rounded-full bg-[hsl(275_55%_60%)] shadow-[0_0_14px_hsl(275_70%_55%)]" />
          <span className="absolute bottom-[20%] left-[10%] h-2 w-2 rounded-full bg-[hsl(210_50%_70%)]" />
        </div>
        <div
          className={cn(
            "absolute h-[min(52vw,230px)] w-[min(52vw,230px)] rounded-full border border-dashed border-[hsl(42_50%_60%/0.2)]",
            !reducedMotion && "amy-astro-orbit-reverse",
          )}
        />
      </div>

      {/* Sacred geometry */}
      <svg
        className={cn(
          "pointer-events-none absolute h-40 w-40 transition-all duration-1000",
          showGeometry ? "scale-100 opacity-80" : "scale-75 opacity-0",
        )}
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle cx="50" cy="50" r="28" fill="none" stroke="url(#cerGold)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="url(#cerGold)" strokeWidth="0.45" />
        <circle cx="50" cy="38" r="10" fill="none" stroke="url(#cerGold)" strokeWidth="0.4" />
        <circle cx="40" cy="56" r="10" fill="none" stroke="url(#cerGold)" strokeWidth="0.4" />
        <circle cx="60" cy="56" r="10" fill="none" stroke="url(#cerGold)" strokeWidth="0.4" />
        <defs>
          <linearGradient id="cerGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(42 90% 75%)" />
            <stop offset="100%" stopColor="hsl(42 55% 48%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Child silhouette from stars */}
      <div
        className={cn(
          "relative z-10 transition-all duration-1000",
          showSilhouette ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        {showSilhouette ? (
          <AmyAstroCosmicPortrait childName={childName} reducedMotion={reducedMotion} />
        ) : (
          <div className="h-[280px] w-[280px]" />
        )}
      </div>

      {/* Amy voice + tagline */}
      <div className="relative z-10 mt-6 max-w-sm px-6 text-center">
        <p
          className={cn(
            "amy-astro-display text-lg leading-snug text-[hsl(42_75%_82%)] transition-opacity duration-700",
            showVoice ? "opacity-100" : "opacity-0",
          )}
          data-testid="amy-astro-ceremony-voice"
        >
          Your child&apos;s cosmic blueprint has finished forming.
        </p>
        <p
          className={cn(
            "mt-3 text-xs uppercase tracking-[0.22em] text-[hsl(40_20%_96%/0.55)] transition-opacity duration-700",
            showTagline ? "opacity-100" : "opacity-0",
          )}
        >
          {tagline || AMY_ASTRO_TAGLINE}
        </p>
        <p className="sr-only" aria-live="polite">
          {showVoice
            ? `${AMY_ASTRO_PRODUCT_NAME}: Your child's cosmic blueprint has finished forming.`
            : "Forming cosmic blueprint…"}
        </p>
      </div>

      {(canSkip || elapsed > 2500 || reducedMotion) && (
        <button
          type="button"
          className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] right-4 z-20 min-h-11 rounded-full border border-white/20 bg-black/40 px-4 text-xs font-semibold text-[hsl(40_20%_96%/0.85)] backdrop-blur"
          onClick={skip}
          data-testid="amy-astro-ceremony-skip"
        >
          Skip
        </button>
      )}
    </div>
  );
}
