export type {
  AgeStageValidation,
  DerivedSchoolFields,
  EducationCountry,
  EducationStageCode,
  EducationStageOption,
  LearningEnvironment,
  StageMetadata,
} from "./types";

export {
  getEducationStagesForChild,
  getTotalMonths,
  isInfantAge,
  isStageAllowedForAge,
  normalizeEducationCountry,
  requiresClassSelection,
  requiresScheduleQuestion,
  shouldAskEducationStage,
  shouldAskWakeSleepAfterStage,
} from "./country-config";

export { STAGE_METADATA } from "./stage-metadata";

export {
  deriveSchoolFieldsFromStage,
  getClassOptionsForCountry,
  inferEducationStageFromLegacy,
  learningEnvironmentLabel,
  resolveEducationStage,
  resolveEducationStageForPersist,
  validateAgeStage,
} from "./derive";

export {
  ageBandIdFromYearsMonths,
  approxDobFromAge,
  resolveChildDob,
  yearsMonthsFromAgeBand,
  type AgeBandId,
} from "./age-dob";

export {
  nextStepAfterClassGrade,
  nextStepAfterDob,
  nextStepAfterEducationStage,
  nextStepAfterInfantSleep,
  nextStepAfterScheduleKnown,
  nextStepAfterSchoolDays,
  nextStepAfterSleep,
  nextStepAfterWake,
  type OnboardingEducationStep,
} from "./onboarding-flow";
