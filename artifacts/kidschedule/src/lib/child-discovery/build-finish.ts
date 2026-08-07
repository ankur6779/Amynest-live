/**
 * Build finish payloads for Child Discovery — same contract as legacy onboarding.
 */
import { readOAuthParentNameHint } from "@/lib/oauth-profile-hints";
import type { InferredChildProfile } from "./infer";

export type DiscoveryFinishInput = {
  child: InferredChildProfile;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  locationSource?: "gps" | "ip" | "manual";
  focusGoal?: string | null;
  parentName?: string;
};

function defaultRegion(code: string): string {
  if (["IN", "PK", "BD", "LK", "NP"].includes(code)) return "north_indian";
  if (["AE", "SA", "QA", "KW", "BH", "OM", "EG", "TR", "JO", "LB"].includes(code)) {
    return "middle_eastern";
  }
  if (["JP", "KR", "CN", "HK", "SG", "TH", "ID", "MY", "PH", "VN"].includes(code)) {
    return "asian";
  }
  return "western";
}

function foodStyleFromRegion(region: string): { foodStyle: string; subCuisine: string | null } {
  if (region.includes("indian")) return { foodStyle: "indian", subCuisine: region === "north_indian" ? "north_indian" : null };
  if (region === "western") return { foodStyle: "western", subCuisine: null };
  if (region === "asian") return { foodStyle: "asian", subCuisine: null };
  if (region === "middle_eastern") return { foodStyle: "middle_eastern", subCuisine: null };
  return { foodStyle: "mixed", subCuisine: null };
}

export function buildDiscoveryFinishPayload(input: DiscoveryFinishInput) {
  const dietType = "vegetarian";
  const foodType = "veg" as const;
  const region = defaultRegion(input.countryCode);
  const { foodStyle, subCuisine } = foodStyleFromRegion(region);
  const goals = input.focusGoal ? [input.focusGoal] : [];
  const goalsText = goals[0] ? `${goals[0]}|balanced-routine` : "balanced-routine";

  const parent: Record<string, unknown> = {
    name: input.parentName?.trim() || readOAuthParentNameHint() || "",
    role: "mother",
    workType: "work_from_home",
    region,
    country: input.countryCode,
    dietType,
    foodType,
    foodStyle,
    subCuisine,
  };
  if (typeof input.latitude === "number") parent.latitude = input.latitude;
  if (typeof input.longitude === "number") parent.longitude = input.longitude;
  if (input.locationSource) parent.locationSource = input.locationSource;

  const child = {
    isOnboarding: true,
    name: input.child.name,
    dob: input.child.dob,
    selectedAgeBand: input.child.selectedAgeBand,
    dobIsEstimated: true,
    age: input.child.age,
    ageMonths: input.child.ageMonths,
    educationStage: input.child.educationStage,
    learningEnvironment: input.child.learningEnvironment,
    scheduleKnown: false,
    isSchoolGoing: input.child.isSchoolGoing,
    childClass: input.child.childClass || "",
    schoolStartTime: input.child.schoolStartTime || "09:00",
    schoolEndTime: input.child.schoolEndTime || "15:00",
    schoolDays: input.child.schoolDays,
    wakeUpTime: input.child.wakeUpTime,
    sleepTime: input.child.sleepTime,
    foodType,
    dietType,
    foodStyle,
    subCuisine,
    allergies: null,
    foodPrefInherited: true,
    foodPrefCustomized: false,
    feedingType: input.child.feedingType || null,
    sleepPattern: input.child.sleepPattern || null,
    goals: goalsText,
  };

  return {
    parent,
    children: [child],
    selectedParentGoals: goals,
    onboardingMeta: {
      children: [
        {
          name: input.child.name,
          ageGroup: `${input.child.age}`,
          problems: goals,
        },
      ],
      parent: {
        caregiver: "mother",
        concern: "",
        routineLevel: "medium",
        dietType,
      },
      priorityGoal: goals[0] ?? "balanced-routine",
    },
  };
}
