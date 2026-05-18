import type { Child } from "@workspace/db";

/** Safe defaults when child row is missing optional fields (never throws). */
export function fallbackChildProfile(userId: string, partial?: Partial<Child>): Child {
  return {
    id: partial?.id ?? 0,
    userId: partial?.userId ?? userId,
    name: partial?.name?.trim() || "Child",
    dob: partial?.dob ?? null,
    age: partial?.age ?? 5,
    ageMonths: partial?.ageMonths ?? 0,
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
  return fallbackChildProfile(child.userId ?? "", child);
}
