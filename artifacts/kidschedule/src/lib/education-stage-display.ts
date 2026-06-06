import type { TFunction } from "i18next";
import {
  deriveSchoolFieldsFromStage,
  getTotalMonths,
  inferEducationStageFromLegacy,
  requiresClassSelection,
  requiresScheduleQuestion,
  resolveEducationStageForPersist,
  type EducationStageCode,
} from "@workspace/education-stages";

export function formatEducationStageLabel(
  stage: string | null | undefined,
  t: TFunction,
): string {
  if (!stage?.trim()) return "";
  const key = `screens.onboarding.stage_${stage}`;
  const label = t(key, { defaultValue: "" });
  return label || stage;
}

export function resolveChildEducationStage(child: {
  educationStage?: string | null;
  isSchoolGoing?: boolean | null;
  childClass?: string | null;
  age?: number;
  ageMonths?: number;
  country?: string | null;
}): EducationStageCode {
  return resolveEducationStageForPersist(
    child.educationStage,
    child.isSchoolGoing,
    child.childClass,
    child.age ?? 0,
    child.ageMonths ?? 0,
    child.country,
  );
}

export function childShowsFormalSchoolSchedule(child: {
  educationStage?: string | null;
  isSchoolGoing?: boolean | null;
  childClass?: string | null;
  age?: number;
  ageMonths?: number;
  scheduleKnown?: boolean | null;
  country?: string | null;
}): boolean {
  const stage = resolveChildEducationStage(child);
  const total = getTotalMonths(child.age ?? 0, child.ageMonths ?? 0);
  return stage === "school" && total >= 72 && child.scheduleKnown === true;
}

export function hydrateChildEducationFormValues(
  child: {
    educationStage?: string | null;
    isSchoolGoing?: boolean | null;
    childClass?: string | null;
    age: number;
    ageMonths?: number | null;
    scheduleKnown?: boolean | null;
  },
  country?: string | null,
): {
  educationStage: EducationStageCode;
  childClass: string;
  scheduleKnown: boolean;
} {
  const stage = resolveEducationStageForPersist(
    child.educationStage,
    child.isSchoolGoing,
    child.childClass,
    child.age,
    child.ageMonths ?? 0,
    country,
  );
  const derived = deriveSchoolFieldsFromStage({
    educationStage: stage,
    childClass: child.childClass,
    scheduleKnown: child.scheduleKnown,
    years: child.age,
    months: child.ageMonths ?? 0,
    country,
  });
  return {
    educationStage: derived.educationStage,
    childClass: derived.childClass ?? "",
    scheduleKnown: derived.scheduleKnown,
  };
}

export function profileFormStageFlags(
  stage: EducationStageCode | undefined,
  totalMonths: number,
): {
  showClass: boolean;
  showScheduleSection: boolean;
} {
  if (!stage) {
    return { showClass: false, showScheduleSection: false };
  }
  return {
    showClass: requiresClassSelection(stage, totalMonths),
    showScheduleSection: requiresScheduleQuestion(stage, totalMonths),
  };
}

export { inferEducationStageFromLegacy };
