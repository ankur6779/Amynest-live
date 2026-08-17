/**
 * Ask Amy remaining + 70–80% education. Presentation only.
 * Does not change quotas, open a paywall, or mention ai_query.
 */

export const AI_QUOTA_EDUCATION_RATIO = 0.7;

export type AiQuotaEducationState = "ok" | "education" | "exhausted";

export function aiQuotaUsedRatio(remaining: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  const used = Math.max(0, limit - Math.max(0, remaining));
  return used / limit;
}

export function resolveAiQuotaEducationState(
  remaining: number,
  limit: number,
  isPremium: boolean,
): AiQuotaEducationState {
  if (isPremium) return "ok";
  if (!Number.isFinite(limit) || limit <= 0) return "ok";
  if (remaining <= 0) return "exhausted";
  const ratio = aiQuotaUsedRatio(remaining, limit);
  // Adult 10/day: remaining 3 = 70%. Infant 3/day: remaining 1 ≈ 67% — still educate.
  if (ratio >= AI_QUOTA_EDUCATION_RATIO || (limit <= 3 && remaining === 1)) {
    return "education";
  }
  return "ok";
}

export function shouldShowAiQuotaEducation(
  remaining: number,
  limit: number,
  isPremium: boolean,
): boolean {
  return resolveAiQuotaEducationState(remaining, limit, isPremium) === "education";
}

export const AI_QUOTA_COPY = {
  education:
    "You've used most of Amy's extra help for today. Premium continues with unlimited Amy help. Extra help also returns tomorrow.",
  resetHint: "Amy's extra help returns tomorrow.",
} as const;
