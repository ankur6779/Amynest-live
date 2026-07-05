/** Shared animation clock — one rAF for all Amy character instances. */

export type AmyAnimationTick = (nowMs: number, dtSec: number) => void;

const subscribers = new Set<AmyAnimationTick>();
let rafId = 0;
let lastMs = 0;

function tick(nowMs: number) {
  const dtSec = lastMs ? Math.min(0.05, (nowMs - lastMs) / 1000) : 0.016;
  lastMs = nowMs;
  for (const fn of subscribers) fn(nowMs, dtSec);
  rafId = subscribers.size > 0 ? requestAnimationFrame(tick) : 0;
}

/** Subscribe to the shared clock. Returns unsubscribe. */
export function subscribeAmyAnimationClock(fn: AmyAnimationTick): () => void {
  subscribers.add(fn);
  if (!rafId && typeof requestAnimationFrame !== "undefined") {
    lastMs = 0;
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      lastMs = 0;
    }
  };
}

/** Active subscriber count (tests / diagnostics). */
export function amyAnimationClockSubscriberCount(): number {
  return subscribers.size;
}
