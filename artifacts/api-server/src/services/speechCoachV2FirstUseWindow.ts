/**
 * Pure Speech Coach V2 first-use math. No DB.
 * Lifetime 90s — never a UTC-day quota.
 */
export const SPEECH_COACH_V2_FIRST_USE_SECONDS = 90;
export const SPEECH_COACH_V2_FIRST_USE_FEATURE = "speech_coach_v2_first_use_seconds";
export const SPEECH_COACH_V2_FIRST_USE_DAY = "lifetime";

export const SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE =
  "You already tried Amy's speaking practice. Premium continues with 10 minutes every day.";

export function firstUseRemainingSeconds(
  usedSeconds: number,
  limitSeconds = SPEECH_COACH_V2_FIRST_USE_SECONDS,
): number {
  const used = Number.isFinite(usedSeconds) ? Math.max(0, Math.floor(usedSeconds)) : 0;
  return Math.max(0, limitSeconds - used);
}

export function firstUseIsExhausted(usedSeconds: number): boolean {
  return firstUseRemainingSeconds(usedSeconds) <= 0;
}

export function capFirstUseCharge(
  usedSeconds: number,
  requestedDelta: number,
  limitSeconds = SPEECH_COACH_V2_FIRST_USE_SECONDS,
): { chargedSeconds: number; usedAfter: number; remainingAfter: number } {
  const remaining = firstUseRemainingSeconds(usedSeconds, limitSeconds);
  const requested = Number.isFinite(requestedDelta) ? Math.max(0, Math.floor(requestedDelta)) : 0;
  const chargedSeconds = Math.min(remaining, requested);
  const usedAfter = Math.min(limitSeconds, Math.max(0, Math.floor(usedSeconds)) + chargedSeconds);
  return {
    chargedSeconds,
    usedAfter,
    remainingAfter: firstUseRemainingSeconds(usedAfter, limitSeconds),
  };
}
