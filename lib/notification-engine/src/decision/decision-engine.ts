import type { LifecycleStage } from "../outcomes/types.js";
import type { FatigueAssessment } from "./fatigue.js";

export interface NotificationCandidate {
  /** Business goal the candidate serves (NotificationGoal name). */
  goal: string;
  /** Strategy priority 0–100 (higher = more important). */
  priority: number;
  /** Whether the message sells/upsells (monetization). */
  monetization: boolean;
  /** Time-critical messages bypass soft gates (e.g. bedtime, routine start). */
  critical?: boolean;
}

export interface DecisionContext {
  lifecycleStage: LifecycleStage;
  fatigue: FatigueAssessment;
  /** User is currently in the app — sending push would be redundant/annoying. */
  isActiveInAppNow?: boolean;
  inQuietHours?: boolean;
  permissionGranted?: boolean;
  isPremium?: boolean;
  highPurchaseIntent?: boolean;
  /** Trailing open rate 0–1 (affinity). Absent → treated as neutral 0.4. */
  openRate7d?: number;
  /** Minutes since the last notification of any kind. Absent → no recency penalty. */
  minutesSinceLastNotification?: number;
  /** The same category was dismissed by the user recently. */
  recentlyDismissedSameTopic?: boolean;
}

export interface Decision {
  send: boolean;
  /** Expected value 0–1; the send threshold is applied against this. */
  expectedValue: number;
  reason: string;
  /** Human-readable factors that shaped the score (for analytics/debugging). */
  factors: string[];
}

const DEFAULT_SEND_THRESHOLD = 0.35;
const MIN_GAP_MINUTES = 90;
const NEUTRAL_OPEN_RATE = 0.4;

/**
 * Decide whether a candidate notification should be sent right now, based on
 * its expected value to the user. Only positive-expected-value sends pass.
 *
 * Pure and side-effect free — the caller supplies all state. Returns a rich
 * reason + factor list so every decision is fully auditable in analytics.
 */
export function decideNotification(
  candidate: NotificationCandidate,
  ctx: DecisionContext,
  sendThreshold = DEFAULT_SEND_THRESHOLD,
): Decision {
  const factors: string[] = [];

  // ── Hard blocks ──────────────────────────────────────────────────────────
  if (ctx.permissionGranted === false) {
    return block("permission_not_granted", factors);
  }
  if (ctx.inQuietHours && !candidate.critical) {
    return block("quiet_hours", factors);
  }
  if (ctx.isActiveInAppNow && !candidate.critical) {
    return block("user_active_in_app", factors);
  }
  if (ctx.fatigue.level === "critical" && !candidate.critical) {
    return block("fatigue_critical", factors);
  }
  // Never sell to existing paying subscribers.
  if (candidate.monetization && ctx.isPremium) {
    return block("monetization_suppressed_premium", factors);
  }

  // ── Expected-value model ─────────────────────────────────────────────────
  // Base value from strategy priority (0–1).
  let ev = candidate.priority / 100;
  factors.push(`base_priority:${candidate.priority}`);

  // Affinity: users who open more get a boost; chronic ignorers get damped.
  const openRate = ctx.openRate7d ?? NEUTRAL_OPEN_RATE;
  const affinityMultiplier = 0.7 + clamp01(openRate) * 0.6; // 0.7 … 1.3
  ev *= affinityMultiplier;
  factors.push(`affinity:${round2(affinityMultiplier)}`);

  // Fatigue reduces value directly through its frequency multiplier.
  ev *= ctx.fatigue.frequencyMultiplier;
  if (ctx.fatigue.level !== "healthy") factors.push(`fatigue:${ctx.fatigue.level}`);

  // Recency: sending too soon after the last message is low value.
  if (
    ctx.minutesSinceLastNotification != null &&
    ctx.minutesSinceLastNotification < MIN_GAP_MINUTES &&
    !candidate.critical
  ) {
    const recencyPenalty = ctx.minutesSinceLastNotification / MIN_GAP_MINUTES; // 0 … 1
    ev *= recencyPenalty;
    factors.push(`recency_penalty:${round2(recencyPenalty)}`);
  }

  // Explicit recent dismissal of the same topic = strong negative signal.
  if (ctx.recentlyDismissedSameTopic && !candidate.critical) {
    ev *= 0.4;
    factors.push("recent_dismissal");
  }

  // High purchase intent amplifies conversion candidates specifically.
  if (candidate.goal === "GOAL_SUBSCRIPTION" && ctx.highPurchaseIntent) {
    ev *= 1.5;
    factors.push("high_purchase_intent_boost");
  }

  // Critical messages get a floor so time-sensitive value is never dropped.
  if (candidate.critical) {
    ev = Math.max(ev, sendThreshold + 0.05);
    factors.push("critical_floor");
  }

  ev = round2(clamp01(ev));
  const send = ev >= sendThreshold;

  return {
    send,
    expectedValue: ev,
    reason: send ? "positive_expected_value" : "below_threshold",
    factors,
  };
}

function block(reason: string, factors: string[]): Decision {
  return { send: false, expectedValue: 0, reason, factors: [...factors, reason] };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
