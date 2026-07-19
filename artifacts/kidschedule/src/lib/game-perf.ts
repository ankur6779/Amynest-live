/**
 * Phase 6 — Gaming Hub performance / battery heuristics.
 * No features — only runtime cost reduction on low-end devices.
 */

export function isPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
}

/**
 * Heuristic for Android Go / ≤2GB / Save-Data — reduce blur & decorative work.
 * Do NOT treat typical 4-core mid-range phones as low-power (that stripped polish for most users).
 */
export function isLowPowerClient(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
      deviceMemory?: number;
    };
    if (nav.connection?.saveData) return true;
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) {
      return true;
    }
    const et = nav.connection?.effectiveType;
    if (et === "slow-2g" || et === "2g") return true;
    // Very constrained CPUs only (Android Go-class), not ordinary mid-range.
    if (
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency > 0 &&
      navigator.hardwareConcurrency <= 2 &&
      (typeof nav.deviceMemory !== "number" || nav.deviceMemory <= 3)
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Soft effects gate for ≤4GB phones (common low/mid Android).
 * Strips glow/blur polish without the full `game-perf-low` catalog strip.
 */
export function shouldReduceGameEffects(): boolean {
  if (isLowPowerClient()) return true;
  if (typeof navigator === "undefined") return false;
  try {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof mem === "number" && mem > 0 && mem <= 4) return true;
  } catch {
    /* ignore */
  }
  return false;
}

type IdleHandle = number;

/** Schedule non-critical work when the main thread is free. */
export function scheduleIdle(fn: () => void, timeoutMs = 1200): () => void {
  if (typeof window === "undefined") return () => undefined;
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => IdleHandle;
      cancelIdleCallback?: (id: IdleHandle) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(fn, { timeout: timeoutMs });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 48);
  return () => window.clearTimeout(id);
}

/** CSS toggles applied on the games hub root under low-power / hidden conditions. */
export const GAME_PERF_STYLES = `
  .game-perf-low .game-motion-float,
  .game-perf-low .games-card-float {
    animation: none !important;
  }
  .game-perf-low .game-a11y-solid-surface,
  .game-perf-low [class*="backdrop-blur"] {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  /* While a game modal is open: stop catalog paint/compositor work under the overlay. */
  .game-hub-frozen {
    content-visibility: hidden;
    visibility: hidden;
    pointer-events: none;
    contain: strict;
  }
  .game-hub-frozen .game-motion-float,
  .game-hub-frozen .games-card-float,
  .game-hub-frozen [style*="animation"] {
    animation: none !important;
  }
  .game-perf-contain {
    content-visibility: auto;
    contain: layout style paint;
  }
  .game-perf-strip {
    contain: layout style;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  .game-perf-gpu {
    transform: translateZ(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .game-perf-gpu { transform: none; }
  }
  /* Target Tap — CSS lifetime shrink (no React scale commits). */
  @keyframes gameTargetLife {
    from { transform: translate(-50%, -50%) scale(1); }
    to { transform: translate(-50%, -50%) scale(0.55); }
  }
  .game-target-life {
    animation-name: gameTargetLife;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .game-target-life { animation: none !important; }
  }
`;
