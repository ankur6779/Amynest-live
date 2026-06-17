export const REACTOR_DURATION_SEC = 20;

export const REACTOR_DIFFICULTIES = ["Steady", "Pulse", "Orbit", "Magnetic", "Chaos"] as const;

export type ReactorDriftMode = 0 | 1 | 2 | 3 | 4;

export type ReactorState = "perfect" | "stable" | "warning" | "critical";

export const REACTOR_MILESTONES = [
  { seconds: 5, label: "Energy Apprentice", emoji: "⚡" },
  { seconds: 10, label: "Reactor Specialist", emoji: "💎" },
  { seconds: 15, label: "Energy Commander", emoji: "🚀" },
  { seconds: 20, label: "Crystal Reactor Master", emoji: "👑" },
] as const;

export const POWER_STAGES = [
  { pct: 0, label: "Power offline", city: "dark" },
  { pct: 25, label: "Systems online", city: "lights" },
  { pct: 50, label: "City lights activate", city: "glow" },
  { pct: 75, label: "Sky towers activate", city: "towers" },
  { pct: 100, label: "Crystal megacity powered", city: "metropolis" },
] as const;

export type CityStage = (typeof POWER_STAGES)[number]["city"];

export function computeDriftOffset(sec: number, mode: ReactorDriftMode): { x: number; y: number } {
  switch (mode) {
    case 0:
      return { x: Math.sin(sec * 0.45) * 5, y: Math.cos(sec * 0.38) * 4 };
    case 1:
      return { x: Math.sin(sec * 4.2) * 12, y: Math.sin(sec * 2.1) * 8 };
    case 2:
      return { x: Math.sin(sec * 1.55) * 24, y: Math.cos(sec * 1.25) * 20 };
    case 3:
      return {
        x: Math.sin(sec * 1.7) * 26 + Math.sin(sec * 3.4) * 10,
        y: Math.cos(sec * 1.35) * 22 + Math.cos(sec * 2.8) * 8,
      };
    case 4:
      return {
        x: Math.sin(sec * 2.4) * 30 + Math.cos(sec * 5.2) * 14,
        y: Math.cos(sec * 1.95) * 26 + Math.sin(sec * 4.8) * 12,
      };
    default:
      return { x: 0, y: 0 };
  }
}

export function getReactorState(driftDistance: number, ringRadius: number): ReactorState {
  const ratio = driftDistance / Math.max(ringRadius * 0.55, 1);
  if (ratio < 0.25) return "perfect";
  if (ratio < 0.45) return "stable";
  if (ratio < 0.7) return "warning";
  return "critical";
}

export function getPowerPercent(elapsed: number): number {
  return Math.min(100, (elapsed / REACTOR_DURATION_SEC) * 100);
}

export function getCityStage(powerPct: number): CityStage {
  if (powerPct >= 100) return "metropolis";
  if (powerPct >= 75) return "towers";
  if (powerPct >= 50) return "glow";
  if (powerPct >= 25) return "lights";
  return "dark";
}

export function getPowerStageLabel(powerPct: number): string {
  const stage = [...POWER_STAGES].reverse().find((s) => powerPct >= s.pct);
  return stage?.label ?? POWER_STAGES[0].label;
}

export const REACTOR_STATE_COLORS: Record<
  ReactorState,
  { glow: string; core: string; ring: string; label: string }
> = {
  perfect: {
    glow: "rgba(59,130,246,0.75)",
    core: "from-blue-400 via-cyan-400 to-indigo-500",
    ring: "border-blue-300/50",
    label: "PERFECT",
  },
  stable: {
    glow: "rgba(34,211,238,0.7)",
    core: "from-cyan-400 via-teal-400 to-violet-500",
    ring: "border-cyan-300/45",
    label: "STABLE",
  },
  warning: {
    glow: "rgba(251,146,60,0.65)",
    core: "from-orange-400 via-amber-400 to-rose-500",
    ring: "border-orange-300/45",
    label: "WARNING",
  },
  critical: {
    glow: "rgba(239,68,68,0.7)",
    core: "from-red-500 via-orange-500 to-rose-600",
    ring: "border-rose-300/50",
    label: "CRITICAL",
  },
};
