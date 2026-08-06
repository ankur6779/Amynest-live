/**
 * Cooldown policy matrix — time + fact binding.
 * Pure. No Decision / History mutation.
 */

import type {
  DecisionCooldownEntry,
  DecisionCooldownFacts,
  DecisionCooldownPolicy,
  DecisionCooldownReason,
  DecisionCooldownState,
} from "./types";

function parseLocalDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

/** End of local calendar day (23:59:59.999). */
export function endOfLocalDayIso(localDateKey: string): string | null {
  const start = parseLocalDateKey(localDateKey);
  if (!start) return null;
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    23,
    59,
    59,
    999,
  );
  return end.toISOString();
}

/** Start of the next local calendar day (eligible again at midnight). */
export function startOfNextLocalDayIso(localDateKey: string): string | null {
  const start = parseLocalDateKey(localDateKey);
  if (!start) return null;
  const next = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return next.toISOString();
}

export function computeExpiresAt(
  policy: DecisionCooldownPolicy,
  facts: DecisionCooldownFacts,
): string | null {
  switch (policy) {
    case "UNTIL_END_OF_DAY":
      return endOfLocalDayIso(facts.localDateKey);
    case "UNTIL_TOMORROW":
      return startOfNextLocalDayIso(facts.localDateKey);
    case "UNTIL_CHALLENGE_CHANGES":
    case "UNTIL_MISSION_CHANGES":
    case "UNTIL_COACH_COMPLETES":
    case "PERMANENT_HIDE":
      return null;
    default:
      return null;
  }
}

export type PolicyEvaluation = Readonly<{
  state: DecisionCooldownState;
  eligibleAgain: boolean;
  reason: DecisionCooldownReason;
  expiresAt: string | null;
}>;

/**
 * Evaluate whether a stored entry is still suppressing recommendations.
 */
export function evaluatePolicyAgainstFacts(
  entry: DecisionCooldownEntry,
  facts: DecisionCooldownFacts,
  now: Date,
): PolicyEvaluation {
  if (entry.cooldownPolicy === "PERMANENT_HIDE") {
    return Object.freeze({
      state: "PERMANENT",
      eligibleAgain: false,
      reason: "PERMANENT_HIDE",
      expiresAt: null,
    });
  }

  // Fact-bound policies
  if (entry.cooldownPolicy === "UNTIL_CHALLENGE_CHANGES") {
    if (facts.challengeKey !== entry.boundChallengeKey) {
      return Object.freeze({
        state: "EXPIRED",
        eligibleAgain: true,
        reason: "CHALLENGE_CHANGED",
        expiresAt: entry.expiresAt,
      });
    }
    return Object.freeze({
      state: "ACTIVE",
      eligibleAgain: false,
      reason: "POLICY_ACTIVE",
      expiresAt: entry.expiresAt,
    });
  }

  if (entry.cooldownPolicy === "UNTIL_MISSION_CHANGES") {
    if (facts.missionKey !== entry.boundMissionKey) {
      return Object.freeze({
        state: "EXPIRED",
        eligibleAgain: true,
        reason: "MISSION_CHANGED",
        expiresAt: entry.expiresAt,
      });
    }
    return Object.freeze({
      state: "ACTIVE",
      eligibleAgain: false,
      reason: "POLICY_ACTIVE",
      expiresAt: entry.expiresAt,
    });
  }

  if (entry.cooldownPolicy === "UNTIL_COACH_COMPLETES") {
    const status = (facts.coachStatus ?? "").toLowerCase();
    const completed =
      status === "completed" ||
      status === "none" ||
      status === "idle";
    const wasActive =
      entry.boundCoachStatus === "active" ||
      entry.boundCoachStatus === "prepared" ||
      entry.boundCoachStatus === "paused";
    if (wasActive && completed) {
      return Object.freeze({
        state: "EXPIRED",
        eligibleAgain: true,
        reason: "COACH_COMPLETED",
        expiresAt: entry.expiresAt,
      });
    }
    // Also expire if coach status changed away from bound while becoming completed-like
    if (
      facts.coachStatus !== entry.boundCoachStatus &&
      (status === "completed" || status === "none")
    ) {
      return Object.freeze({
        state: "EXPIRED",
        eligibleAgain: true,
        reason: "COACH_COMPLETED",
        expiresAt: entry.expiresAt,
      });
    }
    return Object.freeze({
      state: "ACTIVE",
      eligibleAgain: false,
      reason: "POLICY_ACTIVE",
      expiresAt: entry.expiresAt,
    });
  }

  // Time-bound policies
  const expiresAt = entry.expiresAt;
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
    return Object.freeze({
      state: "EXPIRED",
      eligibleAgain: true,
      reason: "TIME_ELAPSED",
      expiresAt,
    });
  }

  return Object.freeze({
    state: "ACTIVE",
    eligibleAgain: false,
    reason: "POLICY_ACTIVE",
    expiresAt,
  });
}
