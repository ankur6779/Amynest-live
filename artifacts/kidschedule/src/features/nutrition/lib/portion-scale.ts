/** Relative portion bar widths (adult = 100%). */
export const PORTION_BAR_RATIOS: Record<"6_12m" | "1_3y" | "4_8y" | "adult", number> = {
  "6_12m": 15,
  "1_3y": 35,
  "4_8y": 55,
  adult: 100,
};

export function portionBarPercent(key: keyof typeof PORTION_BAR_RATIOS): number {
  return PORTION_BAR_RATIOS[key];
}
