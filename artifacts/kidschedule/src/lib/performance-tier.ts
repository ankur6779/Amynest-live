/**
 * Phase 7 — Performance tier detection.
 *
 * Classifies the device into a tier (`low` | `mid` | `high`) so motion-heavy
 * surfaces can simplify themselves on weaker Android devices. Pure detection
 * — no runtime monitoring loop, no global state mutation outside the cache.
 *
 * Tier inputs:
 *  - navigator.hardwareConcurrency
 *  - navigator.deviceMemory (where available)
 *  - prefers-reduced-data
 *  - effectiveType from the Network Information API
 *  - a coarse user-agent signal (low-spec Android)
 *
 * The result is stable per-session — components can call it as often as they
 * need without recomputing.
 */

import { useEffect, useState } from "react";

export type PerformanceTier = "low" | "mid" | "high";

export interface PerformanceTierProfile {
  tier: PerformanceTier;
  hints: {
    hardwareConcurrency: number | null;
    deviceMemoryGb: number | null;
    saveData: boolean;
    slowNetwork: boolean;
    lowSpecAndroid: boolean;
  };
}

type NavWithExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let cached: PerformanceTierProfile | null = null;

function detect(): PerformanceTierProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      tier: "high",
      hints: {
        hardwareConcurrency: null,
        deviceMemoryGb: null,
        saveData: false,
        slowNetwork: false,
        lowSpecAndroid: false,
      },
    };
  }
  const n = navigator as NavWithExtras;
  const cores = typeof n.hardwareConcurrency === "number" ? n.hardwareConcurrency : null;
  const mem = typeof n.deviceMemory === "number" ? n.deviceMemory : null;
  const saveData = !!n.connection?.saveData;
  const eff = n.connection?.effectiveType ?? "";
  const slowNetwork = eff === "slow-2g" || eff === "2g" || eff === "3g";
  const ua = n.userAgent ?? "";
  const lowSpecAndroid = /Android\s(4|5|6)/.test(ua);

  let tier: PerformanceTier = "high";
  // Strong "low" signals
  if (saveData || (mem != null && mem <= 2) || (cores != null && cores <= 2) || lowSpecAndroid) {
    tier = "low";
  } else if (
    (mem != null && mem <= 4) ||
    (cores != null && cores <= 4) ||
    slowNetwork
  ) {
    tier = "mid";
  }

  return {
    tier,
    hints: {
      hardwareConcurrency: cores,
      deviceMemoryGb: mem,
      saveData,
      slowNetwork,
      lowSpecAndroid,
    },
  };
}

export function detectPerformanceTier(): PerformanceTierProfile {
  if (cached) return cached;
  cached = detect();
  return cached;
}

export function performanceTier(): PerformanceTier {
  return detectPerformanceTier().tier;
}

/** React hook — returns the tier (stable per session). */
export function usePerformanceTier(): PerformanceTier {
  const [tier] = useState<PerformanceTier>(() => detectPerformanceTier().tier);
  return tier;
}

/**
 * Visual budget derived from the tier. Surfaces should consult this rather
 * than recomputing the tier themselves. Numbers are intentionally small —
 * the goal is "premium even on low-end", not "showy on high-end".
 */
export interface VisualBudget {
  tier: PerformanceTier;
  particles: number;
  blurPx: number;
  motionScale: number;
  enableGradients: boolean;
  enableShadows: boolean;
}

export function visualBudget(tier?: PerformanceTier): VisualBudget {
  const t = tier ?? performanceTier();
  switch (t) {
    case "low":
      return {
        tier: "low",
        particles: 0,
        blurPx: 0,
        motionScale: 0.6,
        enableGradients: false,
        enableShadows: false,
      };
    case "mid":
      return {
        tier: "mid",
        particles: 6,
        blurPx: 4,
        motionScale: 0.85,
        enableGradients: true,
        enableShadows: true,
      };
    case "high":
    default:
      return {
        tier: "high",
        particles: 16,
        blurPx: 8,
        motionScale: 1,
        enableGradients: true,
        enableShadows: true,
      };
  }
}

/** Force a specific tier (for debug page). */
export function setPerformanceTierForTests(tier: PerformanceTier | null): void {
  cached = tier == null ? null : { tier, hints: { hardwareConcurrency: null, deviceMemoryGb: null, saveData: false, slowNetwork: false, lowSpecAndroid: false } };
}

/** Effect-friendly hook that gives both tier and budget. */
export function useVisualBudget(): VisualBudget {
  const tier = usePerformanceTier();
  const [budget, setBudget] = useState<VisualBudget>(() => visualBudget(tier));
  useEffect(() => {
    setBudget(visualBudget(tier));
  }, [tier]);
  return budget;
}
