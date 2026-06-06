/** First-class education / developmental stage codes stored on child profiles. */
export type EducationStageCode =
  | "at_home"
  | "daycare"
  | "playgroup"
  | "nursery"
  | "lkg"
  | "ukg"
  | "preschool"
  | "pre_k"
  | "kindergarten"
  | "reception"
  | "kindy"
  | "prep"
  | "homeschool"
  | "school";

export type LearningEnvironment =
  | "home"
  | "daycare"
  | "early_learning"
  | "formal_school"
  | "homeschool";

export type EducationCountry = "IN" | "US" | "UK" | "AU" | "DEFAULT";

export type EducationStageOption = {
  code: EducationStageCode;
  labelKey: string;
  emoji: string;
};

export type StageMetadata = {
  code: EducationStageCode;
  learningEnvironment: LearningEnvironment;
  /** Routine / meal scheduling treats child as having fixed away blocks. */
  impliesSchoolGoing: boolean;
  requiresClass: boolean;
  requiresSchedule: boolean;
  /** Canonical childClass when stage encodes a grade band (e.g. lkg → "LKG / KG"). */
  childClassValue: string | null;
  minMonths: number;
  maxMonths: number | null;
};

export type DerivedSchoolFields = {
  isSchoolGoing: boolean;
  childClass: string | null;
  schoolStartTime: string;
  schoolEndTime: string;
  schoolDays: number[] | null;
  learningEnvironment: LearningEnvironment;
  educationStage: EducationStageCode;
  scheduleKnown: boolean;
};

export type AgeStageValidation = {
  valid: boolean;
  reason?: string;
};
