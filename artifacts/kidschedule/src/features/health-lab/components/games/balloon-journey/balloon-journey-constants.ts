export const BALLOON_MAX_SECONDS = 60;

/** Meters gained per second while holding — 3600m at 60s. */
export const ALTITUDE_PER_SECOND = 60;

export const BALLOON_SKY_PHASES = [
  {
    startSec: 0,
    endSec: 10,
    name: "Blue Sky",
    gradient: "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 45%, #bae6fd 100%)",
  },
  {
    startSec: 10,
    endSec: 20,
    name: "Cloud Kingdom",
    gradient: "linear-gradient(180deg, #60a5fa 0%, #93c5fd 40%, #dbeafe 100%)",
  },
  {
    startSec: 20,
    endSec: 30,
    name: "Mountain Peaks",
    gradient: "linear-gradient(180deg, #64748b 0%, #94a3b8 35%, #cbd5e1 100%)",
  },
  {
    startSec: 30,
    endSec: 40,
    name: "Rainbow Valley",
    gradient: "linear-gradient(180deg, #a855f7 0%, #ec4899 35%, #fbbf24 70%, #38bdf8 100%)",
  },
  {
    startSec: 40,
    endSec: 50,
    name: "Golden Sunset",
    gradient: "linear-gradient(180deg, #f97316 0%, #fb923c 30%, #fcd34d 65%, #fda4af 100%)",
  },
  {
    startSec: 50,
    endSec: 60,
    name: "Outer Space",
    gradient: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)",
  },
] as const;

export { BREATH_MILESTONES as BALLOON_JOURNEY_MILESTONES } from "../../../constants";

export type BalloonGlowTier = "low" | "mid" | "high" | "space";

export function getBalloonGlowTier(elapsed: number): BalloonGlowTier {
  if (elapsed >= 50) return "space";
  if (elapsed >= 30) return "high";
  if (elapsed >= 15) return "mid";
  return "low";
}

export function computeAltitudeMeters(elapsed: number): number {
  return Math.round(Math.min(elapsed, BALLOON_MAX_SECONDS) * ALTITUDE_PER_SECOND);
}

export function getSkyGradient(elapsed: number): string {
  const clamped = Math.min(elapsed, BALLOON_MAX_SECONDS);
  for (let i = 0; i < BALLOON_SKY_PHASES.length; i++) {
    const phase = BALLOON_SKY_PHASES[i];
    if (clamped >= phase.startSec && clamped < phase.endSec) {
      const next = BALLOON_SKY_PHASES[i + 1];
      if (!next) return phase.gradient;
      const t = (clamped - phase.startSec) / (phase.endSec - phase.startSec);
      if (t < 0.85) return phase.gradient;
      return next.gradient;
    }
  }
  return BALLOON_SKY_PHASES[BALLOON_SKY_PHASES.length - 1].gradient;
}

export function getCurrentSkyPhase(elapsed: number) {
  const clamped = Math.min(elapsed, BALLOON_MAX_SECONDS);
  return (
    [...BALLOON_SKY_PHASES].reverse().find((p) => clamped >= p.startSec) ??
    BALLOON_SKY_PHASES[0]
  );
}
