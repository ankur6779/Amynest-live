import type { AttentionState, RealtimeEvent } from "./types.js";
import { REALTIME_THRESHOLDS } from "./config.js";

export const DEFAULT_ATTENTION: AttentionState = {
  focusLevel: 0.7,
  fatigueLevel: 0.2,
  boredomLevel: 0.2,
  lastUpdated: Date.now(),
};

export function createAttentionState(): AttentionState {
  return { ...DEFAULT_ATTENTION, lastUpdated: Date.now() };
}

/**
 * Updates focus / fatigue / boredom from recent interaction events.
 */
export function updateAttentionState(
  current: AttentionState,
  events: RealtimeEvent[],
  now = Date.now(),
): AttentionState {
  let focus = current.focusLevel;
  let fatigue = current.fatigueLevel;
  let boredom = current.boredomLevel;

  const recent = events.filter((e) => e.timestamp >= now - 60_000);

  for (const e of recent) {
    switch (e.type) {
      case "CONTENT_COMPLETED": {
        const fast = (e.metadata?.responseTime ?? 9999) < REALTIME_THRESHOLDS.fastResponseMs;
        const correct = e.metadata?.correct !== false;
        if (fast && correct) focus = Math.min(1, focus + 0.08);
        else if (correct) focus = Math.min(1, focus + 0.04);
        else focus = Math.max(0.1, focus - 0.06);
        boredom = Math.max(0, boredom - 0.05);
        break;
      }
      case "CONTENT_SKIPPED":
        boredom = Math.min(1, boredom + 0.12);
        focus = Math.max(0.1, focus - 0.08);
        break;
      case "USER_IDLE":
        boredom = Math.min(1, boredom + 0.15);
        fatigue = Math.min(1, fatigue + 0.1);
        focus = Math.max(0.1, focus - 0.12);
        break;
      case "RAPID_INTERACTION":
        boredom = Math.min(1, boredom + 0.1);
        break;
      case "SESSION_PAUSED":
        fatigue = Math.min(1, fatigue + 0.08);
        break;
      case "CONTENT_STARTED":
        fatigue = Math.min(1, fatigue + 0.02 * ((e.metadata?.duration ?? 0) / 60_000));
        break;
      default:
        break;
    }
  }

  const inconsistent = countInconsistentResponses(recent);
  if (inconsistent >= 2) {
    focus = Math.max(0.15, focus - 0.1);
    boredom = Math.min(1, boredom + 0.08);
  }

  return {
    focusLevel: clamp01(focus),
    fatigueLevel: clamp01(fatigue),
    boredomLevel: clamp01(boredom),
    lastUpdated: now,
  };
}

function countInconsistentResponses(events: RealtimeEvent[]): number {
  const completions = events.filter((e) => e.type === "CONTENT_COMPLETED");
  if (completions.length < 2) return 0;
  let swings = 0;
  for (let i = 1; i < completions.length; i++) {
    const prev = completions[i - 1]!.metadata?.correct;
    const cur = completions[i]!.metadata?.correct;
    if (prev !== cur) swings++;
  }
  return swings;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

export function isFatigueHigh(attention: AttentionState): boolean {
  return attention.fatigueLevel >= 0.65;
}

export function isBoredomHigh(attention: AttentionState): boolean {
  return attention.boredomLevel >= 0.6;
}
