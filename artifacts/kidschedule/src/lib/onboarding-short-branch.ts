import type { TFunction } from "i18next";
import { getSmartWakeSleepDefaults } from "@/lib/onboarding-premium";
import { ageBandToApproxDob, formatAgeBandReply } from "@/lib/onboarding-keyboard-free";
import {
  ageBandIdFromYearsMonths,
  getTotalMonths,
  isInfantAge,
  type EducationStageCode,
} from "@workspace/education-stages";

export type ShortBranchChildDraft = {
  name: string;
  dob: string;
  age: number;
  ageMonths: number;
  ageGroup: "infant" | "toddler" | "kid";
  dobIsEstimated: boolean;
  selectedAgeBand: string;
  educationStage: EducationStageCode;
  learningEnvironment: string;
  scheduleKnown: boolean;
  isSchoolGoing: boolean;
  childClass: string;
  schoolStartTime?: string;
  schoolEndTime?: string;
  schoolDays?: number[];
  wakeUpTime: string;
  sleepTime: string;
  wakeTimeLabel: string;
  feedingType?: string;
  sleepPattern?: string;
  foodType: string;
  dietNote: string;
};

type AgeGroup = ShortBranchChildDraft["ageGroup"];

function getAgeGroup(years: number, months = 0): AgeGroup {
  const total = getTotalMonths(years, months);
  if (total < 24) return "infant";
  if (total < 48) return "toddler";
  return "kid";
}

/** Build a save-ready child profile with smart defaults — skips the long child branch. */
export function buildShortBranchChildDraft(input: {
  name: string;
  years: number;
  months: number;
  bandId?: string;
  countryCode: string;
  t: TFunction;
}): { child: ShortBranchChildDraft; reply: string } {
  const { name, years, months, bandId, countryCode, t } = input;
  const dob = ageBandToApproxDob(years, months);
  const ageGroup = getAgeGroup(years, months);
  const selectedAgeBand = bandId ?? ageBandIdFromYearsMonths(years, months);
  const defaults = getSmartWakeSleepDefaults(years, months);
  const totalMonths = getTotalMonths(years, months);
  const infant = isInfantAge(totalMonths);

  const child: ShortBranchChildDraft = {
    name,
    dob,
    age: years,
    ageMonths: months,
    ageGroup,
    dobIsEstimated: true,
    selectedAgeBand,
    educationStage: "at_home",
    learningEnvironment: "home",
    scheduleKnown: false,
    isSchoolGoing: false,
    childClass: "",
    wakeUpTime: defaults.wakeUpTime,
    sleepTime: defaults.sleepTime,
    wakeTimeLabel: defaults.wakeLabel,
    foodType: "veg",
    dietNote: "",
    ...(infant
      ? { feedingType: "mixed", sleepPattern: "irregular" }
      : {}),
  };

  void countryCode;

  return {
    child,
    reply: formatAgeBandReply(years, months, t),
  };
}
