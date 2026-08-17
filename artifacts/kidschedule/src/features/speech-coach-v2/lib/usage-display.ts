/** Format remaining daily speech time from server seconds. */
export function formatSpeechCoachRemainingLabel(
  remainingSeconds: number,
  isFirstUseFree = false,
): string {
  const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  if (isFirstUseFree) {
    return remainingSeconds <= 0
      ? "Practice complete"
      : `${minutes} min of free practice left`;
  }
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

/** One-time first-use copy — never a daily quota or store trial. */
export function formatSpeechCoachFirstUseAllowanceLabel(input: {
  speechSecondsUsed: number;
  remainingSeconds: number;
  limitReached: boolean;
}): string {
  if (input.limitReached || input.remainingSeconds <= 0) {
    return "You already tried Amy's speaking practice.";
  }
  if (input.speechSecondsUsed <= 0) {
    return "Try Amy's speaking practice free.";
  }
  return "You have a one-time free speaking practice.";
}

export const SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE =
  "You already tried Amy's speaking practice. Premium continues with 10 minutes every day.";
