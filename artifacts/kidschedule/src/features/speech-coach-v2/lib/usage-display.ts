/** Format remaining daily speech time from server seconds. */
export function formatSpeechCoachRemainingLabel(remainingSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  return `${minutes} min left today`;
}

/** Hub card subtitle for Speech Coach V2 daily allowance. */
export function formatSpeechCoachDailyAllowanceLabel(
  dailyLimitSeconds: number,
  isTrial: boolean,
): string {
  const minutes = Math.round(dailyLimitSeconds / 60);
  if (isTrial) {
    return `${minutes} min/day during free trial`;
  }
  return `${minutes} min/day included`;
}
