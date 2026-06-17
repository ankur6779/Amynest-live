import { SPEECH_COACH_V2_DAILY_LIMIT_SECONDS } from "./types";

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

export function remainingDailySeconds(secondsUsed: number): number {
  return Math.max(0, SPEECH_COACH_V2_DAILY_LIMIT_SECONDS - secondsUsed);
}

export function isDailyLimitReached(secondsUsed: number): boolean {
  return secondsUsed >= SPEECH_COACH_V2_DAILY_LIMIT_SECONDS;
}

export const DAILY_LIMIT_MESSAGE =
  "Amazing work today. Come back tomorrow for another speech adventure.";

export function canStartSession(secondsUsed: number): boolean {
  return !isDailyLimitReached(secondsUsed);
}
