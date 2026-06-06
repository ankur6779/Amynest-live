import {
  deriveSchoolFieldsFromStage,
  resolveEducationStageForPersist,
  validateAgeStage,
  type EducationStageCode,
} from "@workspace/education-stages";

type ChildEducationInput = {
  age: number;
  ageMonths?: number | null;
  educationStage?: string | null;
  learningEnvironment?: string | null;
  scheduleKnown?: boolean | null;
  isSchoolGoing?: boolean | null;
  childClass?: string | null;
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
  schoolDays?: number[] | null;
  country?: string | null;
};

export function enrichChildEducationFields<T extends ChildEducationInput>(
  body: T,
  opts?: { country?: string | null; strict?: boolean },
): T & {
  educationStage: EducationStageCode;
  learningEnvironment: string;
  scheduleKnown: boolean;
  isSchoolGoing: boolean;
  childClass: string | null;
  schoolStartTime: string;
  schoolEndTime: string;
  schoolDays: number[] | null;
} {
  const country = opts?.country ?? body.country ?? null;
  const months = body.ageMonths ?? 0;
  const stage = resolveEducationStageForPersist(
    body.educationStage,
    body.isSchoolGoing,
    body.childClass,
    body.age,
    months,
    country,
  );

  if (opts?.strict !== false) {
    const validation = validateAgeStage(body.age, months, stage, country, body.childClass);
    if (!validation.valid) {
      throw new Error(validation.reason ?? "Invalid age-stage combination");
    }
  }

  const derived = deriveSchoolFieldsFromStage({
    educationStage: stage,
    childClass: body.childClass,
    scheduleKnown: body.scheduleKnown,
    schoolStartTime: body.schoolStartTime,
    schoolEndTime: body.schoolEndTime,
    schoolDays: body.schoolDays,
    country,
    years: body.age,
    months,
  });

  return {
    ...body,
    educationStage: derived.educationStage,
    learningEnvironment: derived.learningEnvironment,
    scheduleKnown: derived.scheduleKnown,
    isSchoolGoing: derived.isSchoolGoing,
    childClass: derived.childClass,
    schoolStartTime: derived.schoolStartTime,
    schoolEndTime: derived.schoolEndTime,
    schoolDays: derived.schoolDays,
  };
}
