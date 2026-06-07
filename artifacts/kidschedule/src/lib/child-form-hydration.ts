/**
 * Pure helpers for ChildForm hydration — testable guards against reset/setValue loops.
 */

export type InfantFormSlice = {
  educationStage?: string;
  scheduleKnown?: boolean;
};

export type ChildFormResetSlice = InfantFormSlice & {
  name: string;
  dob: string;
  childClass: string;
  wakeUpTime: string;
  sleepTime: string;
  schoolStartTime: string;
  schoolEndTime: string;
  schoolDays: number[];
  travelMode: string;
  travelModeOther: string;
  foodType: "veg" | "non_veg";
  goals: string;
  babysitterId?: number;
};

/** Stable identity for full profile hydration (immune to react-query refetch churn). */
export function buildChildHydrationKey(
  childId: number,
  dob: string,
  parentCountry: string,
): string {
  return `${childId}:${dob}:${parentCountry}`;
}

/** Education fields only — when parent country loads after child. */
export function buildChildEducationPatchKey(childId: number, dob: string): string {
  return `${childId}:${dob}`;
}

/**
 * Infant profiles must normalize stage fields without unconditional setValue.
 * Returns patches only when values differ (prevents watch → effect → setValue loops).
 */
export function infantFormNormalizationPatches(
  isInfant: boolean,
  values: InfantFormSlice,
): Partial<InfantFormSlice> | null {
  if (!isInfant) return null;
  const patches: Partial<InfantFormSlice> = {};
  if (values.educationStage !== "at_home") {
    patches.educationStage = "at_home";
  }
  if (values.scheduleKnown !== false) {
    patches.scheduleKnown = false;
  }
  return Object.keys(patches).length > 0 ? patches : null;
}

function sortedDaysEqual(a: number[] | undefined, b: number[] | undefined): boolean {
  const left = [...(a ?? [])].sort((x, y) => x - y);
  const right = [...(b ?? [])].sort((x, y) => x - y);
  if (left.length !== right.length) return false;
  return left.every((v, i) => v === right[i]);
}

/** Skip form.reset when RHF already holds the same values (post-reset watcher stability). */
export function childFormResetValuesEqual(
  current: ChildFormResetSlice,
  next: ChildFormResetSlice,
): boolean {
  return (
    current.name === next.name &&
    current.dob === next.dob &&
    current.educationStage === next.educationStage &&
    current.scheduleKnown === next.scheduleKnown &&
    current.childClass === next.childClass &&
    current.wakeUpTime === next.wakeUpTime &&
    current.sleepTime === next.sleepTime &&
    current.schoolStartTime === next.schoolStartTime &&
    current.schoolEndTime === next.schoolEndTime &&
    sortedDaysEqual(current.schoolDays, next.schoolDays) &&
    current.travelMode === next.travelMode &&
    current.travelModeOther === next.travelModeOther &&
    current.foodType === next.foodType &&
    current.goals === next.goals &&
    current.babysitterId === next.babysitterId
  );
}

export function educationFieldsEqual(
  current: InfantFormSlice & { childClass?: string },
  next: InfantFormSlice & { childClass?: string },
): boolean {
  return (
    current.educationStage === next.educationStage &&
    current.scheduleKnown === next.scheduleKnown &&
    (current.childClass ?? "") === (next.childClass ?? "")
  );
}
