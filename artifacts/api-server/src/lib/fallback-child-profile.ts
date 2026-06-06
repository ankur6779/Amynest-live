import type { Child } from "@workspace/db";
import { deriveSchoolFieldsFromStage, resolveEducationStage } from "@workspace/education-stages";

/** Safe defaults when child row is missing optional fields (never throws). */
export function fallbackChildProfile(userId: string, partial?: Partial<Child>): Child {
  return {
    id: partial?.id ?? 0,
    userId: partial?.userId ?? userId,
    name: partial?.name?.trim() || "Child",
    dob: partial?.dob ?? null,
    age: partial?.age ?? 5,
    ageMonths: partial?.ageMonths ?? 0,
    educationStage: partial?.educationStage ?? null,
    learningEnvironment: partial?.learningEnvironment ?? null,
    scheduleKnown: partial?.scheduleKnown ?? null,
    isSchoolGoing: partial?.isSchoolGoing ?? true,
    childClass: partial?.childClass ?? null,
    schoolStartTime: partial?.schoolStartTime ?? "08:00",
    schoolEndTime: partial?.schoolEndTime ?? "14:00",
    schoolDays: partial?.schoolDays ?? [1, 2, 3, 4, 5],
    wakeUpTime: partial?.wakeUpTime ?? "07:00",
    sleepTime: partial?.sleepTime ?? "21:00",
    travelMode: partial?.travelMode ?? "car",
    travelModeOther: partial?.travelModeOther ?? null,
    foodType: partial?.foodType ?? "veg",
    goals: partial?.goals ?? "balanced day",
    babysitterId: partial?.babysitterId ?? null,
    photoUrl: partial?.photoUrl ?? null,
    feedingType: partial?.feedingType ?? null,
    sleepPattern: partial?.sleepPattern ?? null,
    dietType: partial?.dietType ?? null,
    foodStyle: partial?.foodStyle ?? null,
    subCuisine: partial?.subCuisine ?? null,
    allergies: partial?.allergies ?? null,
    foodPrefInherited: partial?.foodPrefInherited ?? false,
    foodPrefCustomized: partial?.foodPrefCustomized ?? false,
    parentGoals: partial?.parentGoals ?? [],
    energyProfile: partial?.energyProfile ?? null,
    fixedActivities: partial?.fixedActivities ?? null,
    createdAt: partial?.createdAt ?? new Date(),
  };
}

/** Merge DB row with defaults so downstream code never reads undefined times. */
export function normalizeChildForRoutine(child: Child): Child {
  const base = fallbackChildProfile(child.userId ?? "", child);
  const stage = resolveEducationStage(
    base.educationStage,
    base.isSchoolGoing,
    base.childClass,
    base.age,
    base.ageMonths ?? 0,
  );
  const derived = deriveSchoolFieldsFromStage({
    educationStage: stage,
    childClass: base.childClass,
    scheduleKnown: base.scheduleKnown,
    schoolStartTime: base.schoolStartTime,
    schoolEndTime: base.schoolEndTime,
    schoolDays: base.schoolDays as number[] | null,
    years: base.age,
    months: base.ageMonths ?? 0,
  });
  return {
    ...base,
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
