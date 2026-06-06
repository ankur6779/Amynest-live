import {
  getTotalMonths,
  isStageAllowedForAge,
  normalizeEducationCountry,
  requiresClassSelection,
  requiresScheduleQuestion,
} from "./country-config";
import { STAGE_METADATA } from "./stage-metadata";
import type {
  AgeStageValidation,
  DerivedSchoolFields,
  EducationStageCode,
  LearningEnvironment,
} from "./types";

const DEFAULT_SCHOOL_START = "09:00";
const DEFAULT_SCHOOL_END = "15:00";
const DEFAULT_SCHOOL_DAYS = [1, 2, 3, 4, 5];

const LEGACY_CLASS_TO_STAGE: Array<{ pattern: RegExp; stage: EducationStageCode }> = [
  { pattern: /nursery/i, stage: "nursery" },
  { pattern: /lkg|lower kindergarten/i, stage: "lkg" },
  { pattern: /ukg|upper kindergarten/i, stage: "ukg" },
  { pattern: /play\s*group/i, stage: "playgroup" },
  { pattern: /pre-?\s*k/i, stage: "pre_k" },
  { pattern: /preschool/i, stage: "preschool" },
  { pattern: /kindergarten|kindy/i, stage: "kindergarten" },
  { pattern: /reception/i, stage: "reception" },
  { pattern: /prep\b/i, stage: "prep" },
  { pattern: /homeschool/i, stage: "homeschool" },
];

function parseStageCode(raw?: string | null): EducationStageCode | null {
  if (!raw?.trim()) return null;
  const v = raw.trim().toLowerCase().replace(/-/g, "_") as EducationStageCode;
  return v in STAGE_METADATA ? v : null;
}

export function validateAgeStage(
  years: number,
  months: number,
  stage: EducationStageCode,
  countryRaw?: string | null,
  childClass?: string | null,
): AgeStageValidation {
  const total = getTotalMonths(years, months);
  if (!isStageAllowedForAge(stage, total, countryRaw)) {
    return {
      valid: false,
      reason: `Stage "${stage}" is not valid for age ${years}y ${months}m in ${normalizeEducationCountry(countryRaw)}`,
    };
  }

  if (requiresClassSelection(stage, total) && !childClass?.trim()) {
    return { valid: false, reason: "Class/grade is required for formal school" };
  }

  if (childClass?.trim() && total < 72) {
    const classNum = parseInt(childClass.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(classNum) && classNum >= 1) {
      return { valid: false, reason: "Formal grade is not valid before age 6" };
    }
  }

  if (childClass?.trim() && total >= 72) {
    const classNum = parseInt(childClass.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(classNum)) {
      const expectedMin = Math.max(1, years - 5);
      const expectedMax = Math.min(12, years - 4);
      if (classNum < expectedMin - 1 || classNum > expectedMax + 2) {
        return {
          valid: false,
          reason: `Class ${classNum} is unlikely for age ${years}`,
        };
      }
    }
  }

  return { valid: true };
}

export function inferEducationStageFromLegacy(
  isSchoolGoing: boolean | null | undefined,
  childClass: string | null | undefined,
  years: number,
  months = 0,
  countryRaw?: string | null,
): EducationStageCode {
  const total = getTotalMonths(years, months);

  if (childClass?.trim()) {
    for (const { pattern, stage } of LEGACY_CLASS_TO_STAGE) {
      if (pattern.test(childClass)) {
        if (isStageAllowedForAge(stage, total, countryRaw)) return stage;
      }
    }
    if (isSchoolGoing) return "school";
  }

  if (isSchoolGoing && total >= 72) return "school";
  if (total < 24) return "at_home";
  if (total < 72) return "at_home";
  return "at_home";
}

export function deriveSchoolFieldsFromStage(input: {
  educationStage: EducationStageCode;
  childClass?: string | null;
  scheduleKnown?: boolean | null;
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
  schoolDays?: number[] | null;
  country?: string | null;
  years?: number;
  months?: number;
}): DerivedSchoolFields {
  const meta = STAGE_METADATA[input.educationStage];
  const total = getTotalMonths(input.years ?? 0, input.months ?? 0);
  const scheduleKnown = input.scheduleKnown === true;
  const needsSchedule = requiresScheduleQuestion(input.educationStage, total);

  let childClass = input.childClass?.trim() || meta.childClassValue;
  if (input.educationStage === "school" && !childClass) {
    childClass = null;
  }

  let schoolStartTime = input.schoolStartTime?.trim() || DEFAULT_SCHOOL_START;
  let schoolEndTime = input.schoolEndTime?.trim() || DEFAULT_SCHOOL_END;
  let schoolDays: number[] | null = meta.impliesSchoolGoing ? [...DEFAULT_SCHOOL_DAYS] : null;

  if (needsSchedule && scheduleKnown) {
    schoolStartTime = input.schoolStartTime?.trim() || DEFAULT_SCHOOL_START;
    schoolEndTime = input.schoolEndTime?.trim() || DEFAULT_SCHOOL_END;
    schoolDays =
      Array.isArray(input.schoolDays) && input.schoolDays.length > 0
        ? input.schoolDays
        : [...DEFAULT_SCHOOL_DAYS];
  } else if (needsSchedule && !scheduleKnown) {
    schoolStartTime = DEFAULT_SCHOOL_START;
    schoolEndTime = DEFAULT_SCHOOL_END;
    schoolDays = [...DEFAULT_SCHOOL_DAYS];
  } else if (!meta.impliesSchoolGoing) {
    schoolStartTime = DEFAULT_SCHOOL_START;
    schoolEndTime = DEFAULT_SCHOOL_END;
    schoolDays = null;
  }

  return {
    educationStage: input.educationStage,
    learningEnvironment: meta.learningEnvironment,
    isSchoolGoing: meta.impliesSchoolGoing,
    childClass,
    schoolStartTime,
    schoolEndTime,
    schoolDays,
    scheduleKnown: needsSchedule ? scheduleKnown : false,
  };
}

export function resolveEducationStage(
  educationStageRaw?: string | null,
  isSchoolGoing?: boolean | null,
  childClass?: string | null,
  years = 0,
  months = 0,
  countryRaw?: string | null,
): EducationStageCode {
  const parsed = parseStageCode(educationStageRaw);
  if (parsed) return parsed;
  return inferEducationStageFromLegacy(isSchoolGoing, childClass, years, months, countryRaw);
}

export function getClassOptionsForCountry(countryRaw?: string | null): string[] {
  const country = normalizeEducationCountry(countryRaw);
  if (country === "IN") {
    return ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
  }
  if (country === "UK") {
    return ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8+"];
  }
  if (country === "AU") {
    return ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8+"];
  }
  return ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8+"];
}

export function learningEnvironmentLabel(env: LearningEnvironment): string {
  const labels: Record<LearningEnvironment, string> = {
    home: "At home",
    daycare: "Daycare",
    early_learning: "Early learning",
    formal_school: "Formal school",
    homeschool: "Homeschool",
  };
  return labels[env];
}
