import {
  isInfantAge,
  requiresClassSelection,
  requiresScheduleQuestion,
} from "./country-config";
import type { EducationStageCode } from "./types";

export type OnboardingEducationStep =
  | "infant-feeding"
  | "child-education-stage"
  | "child-class-grade"
  | "child-schedule-known"
  | "child-school-start"
  | "child-school-end"
  | "child-school-days"
  | "child-wake"
  | "child-sleep";

export function nextStepAfterDob(totalMonths: number): OnboardingEducationStep {
  return isInfantAge(totalMonths) ? "infant-feeding" : "child-education-stage";
}

export function nextStepAfterInfantSleep(): OnboardingEducationStep {
  return "child-education-stage";
}

export function nextStepAfterEducationStage(
  stage: EducationStageCode,
  totalMonths: number,
): OnboardingEducationStep {
  if (requiresClassSelection(stage, totalMonths)) return "child-class-grade";
  if (requiresWakeSleep(totalMonths)) return "child-wake";
  return "child-wake";
}

export function nextStepAfterClassGrade(): OnboardingEducationStep {
  return "child-schedule-known";
}

export function nextStepAfterScheduleKnown(
  known: boolean,
  stage: EducationStageCode,
  totalMonths: number,
): OnboardingEducationStep {
  if (known && requiresScheduleQuestion(stage, totalMonths)) return "child-school-start";
  return "child-wake";
}

export function nextStepAfterSchoolDays(): OnboardingEducationStep {
  return "child-wake";
}

export function nextStepAfterWake(): OnboardingEducationStep {
  return "child-sleep";
}

export function nextStepAfterSleep(): OnboardingEducationStep {
  return "child-sleep";
}

export function requiresWakeSleep(totalMonths: number): boolean {
  return true;
}
