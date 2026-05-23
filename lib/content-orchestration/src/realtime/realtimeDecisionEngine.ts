import type {
  AttentionState,
  RealtimeDecision,
  RealtimeEvent,
  RealtimeSessionState,
} from "./types.js";
import { REALTIME_THRESHOLDS } from "./config.js";
import { isBoredomHigh, isFatigueHigh } from "./attentionEngine.js";

function countConsecutiveSkips(events: RealtimeEvent[]): number {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === "CONTENT_SKIPPED") n++;
    else if (events[i]!.type === "CONTENT_COMPLETED" || events[i]!.type === "CONTENT_STARTED") {
      break;
    }
  }
  return n;
}

function hasFastCorrectResponses(events: RealtimeEvent[]): boolean {
  const completions = events.filter((e) => e.type === "CONTENT_COMPLETED").slice(-3);
  if (completions.length < 2) return false;
  return completions.every(
    (e) =>
      (e.metadata?.responseTime ?? 9999) < REALTIME_THRESHOLDS.fastResponseMs &&
      e.metadata?.correct !== false,
  );
}

function isIdleBeyondThreshold(
  events: RealtimeEvent[],
  now: number,
): boolean {
  const last = events[events.length - 1];
  if (!last) return false;
  if (last.type === "USER_IDLE") return true;
  return now - last.timestamp > REALTIME_THRESHOLDS.idleMs;
}

function hasRapidTaps(events: RealtimeEvent[], now: number): boolean {
  const window = REALTIME_THRESHOLDS.rapidTapWindowMs;
  const rapid = events.filter(
    (e) =>
      e.type === "RAPID_INTERACTION" &&
      e.timestamp >= now - window &&
      (e.metadata?.tapCount ?? 1) >= REALTIME_THRESHOLDS.rapidTapCount,
  );
  return rapid.length > 0;
}

/**
 * Rule-based decision engine (V3 fallback when ML confidence is low).
 * Decides within 1–2 interactions (uses last ~10 events only).
 */
export function evaluateRuleBasedDecision(
  state: RealtimeSessionState,
  latestEvent: RealtimeEvent,
  attention: AttentionState,
): RealtimeDecision {
  const events = [...state.recentEvents, latestEvent].slice(-12);
  const now = latestEvent.timestamp;

  if (countConsecutiveSkips(events) >= REALTIME_THRESHOLDS.consecutiveSkipsForLower) {
    return {
      action: "ADJUST_DIFFICULTY",
      payload: { direction: "down", delta: 0.5 },
      reason: "consecutive_skips",
    };
  }

  if (hasFastCorrectResponses(events)) {
    return {
      action: "ADJUST_DIFFICULTY",
      payload: { direction: "up", delta: 0.35 },
      reason: "fast_correct_streak",
    };
  }

  if (isIdleBeyondThreshold(events, now) || latestEvent.type === "USER_IDLE") {
    return {
      action: "SWAP_CONTENT",
      payload: { strategy: "fresh_module" },
      reason: "user_idle",
    };
  }

  if (hasRapidTaps(events, now) || latestEvent.type === "RAPID_INTERACTION") {
    return {
      action: "INJECT_REWARD",
      payload: { slot: "next" },
      reason: "rapid_interaction",
    };
  }

  if (isFatigueHigh(attention) || isBoredomHigh(attention)) {
    if (isFatigueHigh(attention) && state.sessionPlan.length - state.currentIndex > 3) {
      return {
        action: "SHORTEN_SESSION",
        payload: { removeCount: 2 },
        reason: "fatigue_high",
      };
    }
    return {
      action: "INJECT_REWARD",
      payload: { slot: "next" },
      reason: "fatigue_or_boredom",
    };
  }

  return { action: "NOOP", payload: {}, reason: "stable" };
}

/** @deprecated Use evaluateRuleBasedDecision */
export const evaluateRealtimeDecision = evaluateRuleBasedDecision;

export function decisionInFallbackMode(): RealtimeDecision {
  return { action: "NOOP", payload: {}, reason: "fallback_static_plan" };
}
