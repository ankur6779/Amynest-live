/** Pure Talk-with-Amy calendar math. No DB. Clock starts at first-use ms. */
export const FREE_CONVERSATION_TRIAL_DAYS = 3;

export function conversationTrialWindow(
  firstUseMs: number | null,
  nowMs: number,
  trialDays = FREE_CONVERSATION_TRIAL_DAYS,
): { trialExpired: boolean; trialDaysLeft: number } {
  if (firstUseMs == null || firstUseMs <= 0) {
    return { trialExpired: false, trialDaysLeft: trialDays };
  }
  const daysUsed = (nowMs - firstUseMs) / 86_400_000;
  return {
    trialExpired: daysUsed > trialDays,
    trialDaysLeft: Math.max(0, Math.ceil(trialDays - daysUsed)),
  };
}
