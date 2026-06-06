import type { TFunction } from "i18next";
import { approxDobFromAge } from "@workspace/education-stages";

export type AgeBandOption = {
  id: string;
  labelKey: string;
  years: number;
  months: number;
};

export type TimeRangeOption = {
  id: string;
  labelKey: string;
  displayTime: string;
};

export type SchoolSchedulePreset = {
  id: string;
  labelKey: string;
  start: string;
  end: string;
  days: number[];
};

const NAME_SUGGESTIONS_BY_COUNTRY: Record<string, string[]> = {
  IN: ["Aarav", "Anaya", "Vihaan", "Aadhya", "Arjun", "Diya"],
  US: ["Emma", "Liam", "Olivia", "Noah", "Ava", "Mason"],
  UK: ["Oliver", "Amelia", "George", "Isla", "Arthur", "Mia"],
  AU: ["Charlotte", "Oliver", "Amelia", "Jack", "Isla", "William"],
  DEFAULT: ["Maya", "Leo", "Zoe", "Noah", "Emma", "Sam"],
};

export function getChildNameSuggestions(countryCode: string): string[] {
  return NAME_SUGGESTIONS_BY_COUNTRY[countryCode] ?? NAME_SUGGESTIONS_BY_COUNTRY.DEFAULT;
}

const AGE_BANDS: AgeBandOption[] = [
  { id: "under_1", labelKey: "age_under_1", years: 0, months: 6 },
  { id: "y1", labelKey: "age_1", years: 1, months: 0 },
  { id: "y2", labelKey: "age_2", years: 2, months: 0 },
  { id: "y3", labelKey: "age_3", years: 3, months: 0 },
  { id: "y4", labelKey: "age_4", years: 4, months: 0 },
  { id: "y5", labelKey: "age_5", years: 5, months: 0 },
  { id: "y6", labelKey: "age_6", years: 6, months: 0 },
  { id: "y7", labelKey: "age_7", years: 7, months: 0 },
  { id: "y8_plus", labelKey: "age_8_plus", years: 8, months: 0 },
];

export function getAgeBandOptions(): AgeBandOption[] {
  return AGE_BANDS;
}

/** Approximate DOB from age band — used for routine personalization, not legal records. */
export function ageBandToApproxDob(years: number, months: number): string {
  return approxDobFromAge(years, months);
}

export function formatAgeBandReply(years: number, months: number, t: TFunction): string {
  if (years === 0) return t("screens.onboarding.age_reply_under_1");
  if (years >= 8) return t("screens.onboarding.age_reply_8_plus");
  return t("screens.onboarding.age_reply_years", { years: String(years) });
}

/** One contextual delight line after age selection — keep under ~12 words. */
export function getAgeMilestoneDelightKey(years: number): string | null {
  if (years === 0) return "age_delight_under_1";
  if (years === 1) return "age_delight_1";
  if (years === 2) return "age_delight_2";
  if (years === 3) return "age_delight_3";
  if (years === 4) return "age_delight_4";
  if (years === 5) return "age_delight_5";
  if (years === 6) return "age_delight_6";
  if (years === 7) return "age_delight_7";
  if (years >= 8) return "age_delight_8_plus";
  return null;
}

export function nextStepAfterBirthday(totalMonths: number): "infant-feeding" | "child-education-stage" {
  return totalMonths < 24 ? "infant-feeding" : "child-education-stage";
}

export function getWakeTimeRanges(): TimeRangeOption[] {
  return [
    { id: "before_6", labelKey: "wake_before_6", displayTime: "5:30 AM" },
    { id: "6_7", labelKey: "wake_6_7", displayTime: "6:30 AM" },
    { id: "7_8", labelKey: "wake_7_8", displayTime: "7:30 AM" },
    { id: "8_9", labelKey: "wake_8_9", displayTime: "8:30 AM" },
    { id: "after_9", labelKey: "wake_after_9", displayTime: "9:00 AM" },
  ];
}

export function getSleepTimeRanges(): TimeRangeOption[] {
  return [
    { id: "before_8", labelKey: "sleep_before_8", displayTime: "7:30 PM" },
    { id: "8_9", labelKey: "sleep_8_9", displayTime: "8:30 PM" },
    { id: "9_10", labelKey: "sleep_9_10", displayTime: "9:30 PM" },
    { id: "10_11", labelKey: "sleep_10_11", displayTime: "10:30 PM" },
    { id: "after_11", labelKey: "sleep_after_11", displayTime: "11:00 PM" },
  ];
}

export function getSchoolSchedulePresets(): SchoolSchedulePreset[] {
  return [
    { id: "8_2", labelKey: "school_preset_8_2", start: "08:00", end: "14:00", days: [1, 2, 3, 4, 5] },
    { id: "830_3", labelKey: "school_preset_830_3", start: "08:30", end: "15:00", days: [1, 2, 3, 4, 5] },
    { id: "9_3", labelKey: "school_preset_9_3", start: "09:00", end: "15:00", days: [1, 2, 3, 4, 5] },
  ];
}
