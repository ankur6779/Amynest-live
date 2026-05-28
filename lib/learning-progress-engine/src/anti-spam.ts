/**
 * Phase 6 — Anti-spam / anti-farm utilities.
 *
 * Pure functions used by both the API service (server-authoritative gate) and
 * the client sync engine (optimistic suppression).
 *
 * IMPORTANT: These helpers DO NOT introduce new state. They take the existing
 * profile + a small `recentActivity` log and decide whether a completion
 * should be credited at full XP, partial XP, or ignored as spam.
 */

import type { LearningProgressProfile, SectionKey } from "./types";

export type ActivityIngestDecision = "credit" | "diminish" | "ignore";

export interface RecentActivityEvent {
  activityId: string;
  section: SectionKey;
  /** ISO timestamp. */
  at: string;
  correct: boolean;
}

export interface AntiSpamResult {
  decision: ActivityIngestDecision;
  /** Multiplier applied to XP/mastery contribution. 0 = ignore. */
  xpMultiplier: number;
  /** Why the decision was reached — surfaced in logs, never to children. */
  reason: string;
}

/** Cooldown window (ms) after which the same activity can be credited again. */
export const ACTIVITY_COOLDOWN_MS = 90 * 1000;
/** Window for repetition tally. */
export const REPETITION_WINDOW_MS = 10 * 60 * 1000;
/** Maximum credited completions of the same activity inside the window. */
export const REPETITION_FULL_CAP = 3;
/** Hard cap — beyond this we ignore additional completions. */
export const REPETITION_HARD_CAP = 6;
/** Maximum total events credited across all activities per minute. */
export const PER_MINUTE_BURST_CAP = 12;

/** Convert ISO/Date to ms. Safe for null/undefined. */
function ms(t: string | Date | null | undefined): number {
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  const v = Date.parse(t);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Decide how much credit a new completion deserves given recent activity.
 * Server-side callers must pass authoritative `recent` from their store; the
 * client may pass an optimistic log for UI gating.
 */
export function evaluateActivityIngest(input: {
  activityId: string;
  section: SectionKey;
  correct: boolean;
  nowIso?: string;
  recent: RecentActivityEvent[];
  /** Profile snapshot — used only to soften penalties for new learners. */
  profile?: Pick<LearningProgressProfile, "completedActivities" | "streakDays">;
}): AntiSpamResult {
  const now = ms(input.nowIso ?? new Date().toISOString());
  if (now === 0) {
    return { decision: "credit", xpMultiplier: 1, reason: "no_clock" };
  }
  const recent = input.recent ?? [];

  const sameInCooldown = recent.find(
    (e) => e.activityId === input.activityId && now - ms(e.at) < ACTIVITY_COOLDOWN_MS,
  );
  if (sameInCooldown) {
    return {
      decision: "ignore",
      xpMultiplier: 0,
      reason: "duplicate_within_cooldown",
    };
  }

  const sameInWindow = recent.filter(
    (e) => e.activityId === input.activityId && now - ms(e.at) < REPETITION_WINDOW_MS,
  ).length;

  if (sameInWindow >= REPETITION_HARD_CAP) {
    return {
      decision: "ignore",
      xpMultiplier: 0,
      reason: "repetition_hard_cap",
    };
  }

  const perMinute = recent.filter((e) => now - ms(e.at) < 60_000).length;
  if (perMinute >= PER_MINUTE_BURST_CAP) {
    return {
      decision: "ignore",
      xpMultiplier: 0,
      reason: "burst_cap",
    };
  }

  if (sameInWindow >= REPETITION_FULL_CAP) {
    // Diminishing returns after the cap: 50% → 25% → 10%.
    const overage = sameInWindow - REPETITION_FULL_CAP;
    const multiplier = overage === 0 ? 0.5 : overage === 1 ? 0.25 : 0.1;
    return {
      decision: "diminish",
      xpMultiplier: multiplier,
      reason: "repetition_diminished",
    };
  }

  return { decision: "credit", xpMultiplier: 1, reason: "ok" };
}

/**
 * Lightweight client-side guard — returns true when the same activity was
 * very recently submitted. Use to debounce UI taps.
 */
export function isLikelyDuplicateTap(
  activityId: string,
  recent: Pick<RecentActivityEvent, "activityId" | "at">[],
  nowIso?: string,
): boolean {
  const now = ms(nowIso ?? new Date().toISOString());
  return recent.some(
    (e) => e.activityId === activityId && now - ms(e.at) < ACTIVITY_COOLDOWN_MS,
  );
}

/**
 * Diversity weighting — reward learners who explore multiple sections. Pure
 * derivation from existing recent log. Returns a small multiplier 1.0 – 1.15.
 */
export function diversityMultiplier(recent: RecentActivityEvent[]): number {
  if (recent.length === 0) return 1;
  const sections = new Set<SectionKey>();
  for (const e of recent) sections.add(e.section);
  const n = sections.size;
  if (n >= 4) return 1.15;
  if (n >= 3) return 1.1;
  if (n >= 2) return 1.05;
  return 1;
}
