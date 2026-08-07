/**
 * Child Discovery inference — Question Tax Law.
 * Prefer safe inference over asking.
 */
import {
  ageBandIdFromYearsMonths,
  deriveSchoolFieldsFromStage,
  getTotalMonths,
  isInfantAge,
  type EducationStageCode,
} from "@workspace/education-stages";
import { getSmartWakeSleepDefaults } from "@/lib/onboarding-premium";
import { ageBandToApproxDob } from "@/lib/onboarding-keyboard-free";
import type { FirstExperienceTodayContext } from "@/lib/first-experience/types";

export type InferredChildProfile = {
  name: string;
  age: number;
  ageMonths: number;
  dob: string;
  dobIsEstimated: true;
  selectedAgeBand: string;
  educationStage: EducationStageCode;
  learningEnvironment: string;
  scheduleKnown: false;
  isSchoolGoing: boolean;
  childClass: string;
  schoolStartTime: string;
  schoolEndTime: string;
  schoolDays: number[];
  wakeUpTime: string;
  sleepTime: string;
  wakeLabel: string;
  sleepLabel: string;
  feedingType?: string;
  sleepPattern?: string;
};

/** Infer education stage from age + today's world — never invent clinical stages. */
export function inferEducationStage(
  years: number,
  months: number,
  todayContext: FirstExperienceTodayContext,
): EducationStageCode {
  const total = getTotalMonths(years, months);
  if (todayContext !== "school") {
    if (total < 18) return "at_home";
    if (total < 36) return "daycare";
    return "at_home";
  }
  if (total < 30) return "playgroup";
  if (total < 48) return "preschool";
  if (total < 72) return "kindergarten";
  return "school";
}

export function inferChildProfile(input: {
  name: string;
  years: number;
  months?: number;
  todayContext: FirstExperienceTodayContext;
  countryCode: string;
  feedingType?: string;
  sleepPattern?: string;
}): InferredChildProfile {
  const months = input.months ?? 0;
  const years = input.years;
  const stage = inferEducationStage(years, months, input.todayContext);
  const derived = deriveSchoolFieldsFromStage({
    educationStage: stage,
    years,
    months,
    country: input.countryCode,
    scheduleKnown: false,
  });
  const defaults = getSmartWakeSleepDefaults(years, months);
  const total = getTotalMonths(years, months);
  const infant = isInfantAge(total);

  let childClass = derived.childClass || "";
  if (stage === "school" && !childClass.trim() && years >= 6) {
    childClass = String(Math.max(1, Math.min(12, years - 5)));
  }

  return {
    name: input.name.trim(),
    age: years,
    ageMonths: months,
    dob: ageBandToApproxDob(years, months),
    dobIsEstimated: true,
    selectedAgeBand: ageBandIdFromYearsMonths(years, months),
    educationStage: (derived.educationStage ?? stage) as EducationStageCode,
    learningEnvironment: derived.learningEnvironment ?? "home",
    scheduleKnown: false,
    isSchoolGoing: derived.isSchoolGoing ?? input.todayContext === "school",
    childClass: childClass || "",
    schoolStartTime: derived.schoolStartTime || "09:00",
    schoolEndTime: derived.schoolEndTime || "15:00",
    schoolDays: derived.schoolDays ?? [1, 2, 3, 4, 5],
    wakeUpTime: defaults.wakeUpTime,
    sleepTime: defaults.sleepTime,
    wakeLabel: defaults.wakeLabel,
    sleepLabel: defaults.sleepLabel,
    ...(infant
      ? {
          feedingType: input.feedingType ?? "mixed",
          sleepPattern: input.sleepPattern ?? "irregular",
        }
      : {}),
  };
}

export function shouldAskTodayWorld(
  todayContext: FirstExperienceTodayContext | null | undefined,
): boolean {
  return !todayContext || todayContext === "unsure";
}

export function shouldAskInfantCare(years: number, months = 0): boolean {
  return isInfantAge(getTotalMonths(years, months));
}
