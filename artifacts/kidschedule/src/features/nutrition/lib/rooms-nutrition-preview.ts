import { getMondayBasedDayIndex, monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import {
  AGE_GROUPS,
  getMealPlan,
  type AgeGroupId,
} from "@/lib/nutrition-data";

export type RoomsNutritionPreview = {
  ageGroupId: AgeGroupId;
  label: string;
  description: string;
  focus: string | null;
  dayLabel: string | null;
  lunch: string | null;
  snack: string | null;
  hasMeal: boolean;
};

/** Static age-adapted preview for Rooms Care → Nutrition. No network. */
export function roomsNutritionPreview(ageMonths: number): RoomsNutritionPreview {
  const ageGroupId = monthsToAgeGroupId(ageMonths);
  const group = AGE_GROUPS.find((entry) => entry.id === ageGroupId);
  const plan = getMealPlan(ageGroupId, "mixed");
  const day = plan?.days[getMondayBasedDayIndex()] ?? null;

  return {
    ageGroupId,
    label: group?.label ?? ageGroupId,
    description: group?.description ?? "",
    focus: group?.keyFocus[0] ?? null,
    dayLabel: day?.day ?? null,
    lunch: day?.veg.lunch ?? null,
    snack: day?.veg.snack ?? null,
    hasMeal: Boolean(day?.veg.lunch),
  };
}
