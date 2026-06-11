import {
  computeSkillBreakdown,
  deriveAdaptivityTier,
  isActivityUnlocked,
  type AdaptivityTier,
  type PlaygroundLearningState,
  type SkillBreakdown,
  type WorksheetCategory,
  type WorksheetLevel,
} from "@workspace/math-playground";

export function masteryForCategory(
  breakdown: SkillBreakdown,
  category: WorksheetCategory,
): number {
  return breakdown[category];
}

export function selectWorksheetLevel(
  mastery: number,
  tier: AdaptivityTier,
): WorksheetLevel {
  let level: WorksheetLevel;
  if (mastery >= 88) level = 4;
  else if (mastery >= 72) level = 3;
  else if (mastery >= 50) level = 2;
  else level = 1;

  if (tier === "ease" && level > 1) level = (level - 1) as WorksheetLevel;
  if (tier === "stretch" && level < 4) level = (level + 1) as WorksheetLevel;

  return level;
}

export function pickWorksheetCategory(
  learning: PlaygroundLearningState,
  ageYears: number,
  preferred?: WorksheetCategory,
): WorksheetCategory {
  if (preferred) return preferred;

  const breakdown = computeSkillBreakdown(learning);
  let lowest: WorksheetCategory = "counting";
  let lowestScore = 101;

  const order: WorksheetCategory[] = [
    "counting",
    "addition",
    "subtraction",
    "patterns",
    "multiplication",
    "division",
  ];

  for (const cat of order) {
    const activity =
      cat === "counting"
        ? "counting_adventure"
        : cat === "addition"
          ? "addition_lab"
          : cat === "subtraction"
            ? "subtraction_garden"
            : cat === "patterns"
              ? "number_patterns"
              : cat === "multiplication"
                ? "multiplication_factory"
                : "division_bakery";

    if (!isActivityUnlocked(activity, ageYears)) continue;

    const score = breakdown[cat];
    if (score > 0 && score < lowestScore) {
      lowestScore = score;
      lowest = cat;
    }
  }

  if (lowestScore <= 100) return lowest;
  return "counting";
}

export function tierForWorksheet(
  learning: PlaygroundLearningState,
  category: WorksheetCategory,
): AdaptivityTier {
  const activityId =
    category === "counting"
      ? "counting_adventure"
      : category === "addition"
        ? "addition_lab"
        : category === "subtraction"
          ? "subtraction_garden"
          : category === "patterns"
            ? "number_patterns"
            : category === "multiplication"
              ? "multiplication_factory"
              : "division_bakery";
  return deriveAdaptivityTier(activityId, learning);
}
