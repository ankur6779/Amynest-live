import {
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
} from "./types";

export interface DailyUsageState {
  speechSecondsUsed: number;
  speechMinutesToday: number;
  dateKey: string;
}

export function utcDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dailyUsageFromSeconds(secondsUsed: number): DailyUsageState {
  return {
    speechSecondsUsed: secondsUsed,
    speechMinutesToday: Math.floor(secondsUsed / 60),
    dateKey: utcDateKey(),
  };
}

export function remainingDailySeconds(
  secondsUsed: number,
  dailyLimitSeconds: number,
): number {
  return Math.max(0, dailyLimitSeconds - secondsUsed);
}

export function remainingMonthlySeconds(
  secondsUsed: number,
  monthlyLimitSeconds: number,
): number {
  return Math.max(0, monthlyLimitSeconds - secondsUsed);
}

export function remainingSpeechCoachSeconds(input: {
  dailyUsedSeconds: number;
  dailyLimitSeconds: number;
  monthlyUsedSeconds: number;
  monthlyLimitSeconds: number;
}): number {
  return Math.min(
    remainingDailySeconds(input.dailyUsedSeconds, input.dailyLimitSeconds),
    remainingMonthlySeconds(input.monthlyUsedSeconds, input.monthlyLimitSeconds),
  );
}

export function isDailyLimitReached(
  secondsUsed: number,
  dailyLimitSeconds: number,
): boolean {
  if (dailyLimitSeconds <= 0) return true;
  return secondsUsed >= dailyLimitSeconds;
}

export function isMonthlyLimitReached(
  secondsUsed: number,
  monthlyLimitSeconds: number,
): boolean {
  if (monthlyLimitSeconds <= 0) return true;
  return secondsUsed >= monthlyLimitSeconds;
}

export const DAILY_LIMIT_MESSAGE =
  "Amazing work today! 🌟 You have completed today's speech practice. Come back tomorrow for another session.";

export const TRIAL_UPGRADE_CTA =
  "Unlock 10 minutes/day with AmyNest Premium.";

export function canStartSession(
  secondsUsed: number,
  dailyLimitSeconds: number,
): boolean {
  return !isDailyLimitReached(secondsUsed, dailyLimitSeconds);
}

/** Default paid-tier limit for legacy call sites. */
export const DEFAULT_PAID_DAILY_LIMIT_SECONDS = SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS;
