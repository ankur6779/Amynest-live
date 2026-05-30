import { INFANT_PROBLEMS } from "@workspace/infant-problems";

/** Ordered goal ids per Amy Coach category — first id is the free sample. */
export const COACH_CATEGORY_GOAL_IDS: Record<string, readonly string[]> = {
  behavior: [
    "manage-tantrums",
    "handle-aggression",
    "reduce-defiance",
    "emotional-regulation",
    "separation-anxiety",
  ],
  "screen-focus": [
    "balance-screen-time",
    "reduce-mobile-addiction",
    "improve-focus-span",
    "reduce-shorts-overuse",
    "reduce-instant-gratification",
  ],
  eating: [
    "encourage-independent-eating",
    "navigate-fussy-eating",
    "stop-junk-food-craving",
    "healthy-eating-routine",
    "improve-mealtime-behavior",
  ],
  sleep: [
    "improve-sleep-patterns",
    "fix-bedtime-resistance",
    "stop-night-waking",
    "consistent-sleep-routine",
    "reduce-late-sleeping",
  ],
  learning: [
    "boost-concentration",
    "build-study-discipline",
    "increase-learning-interest",
    "reduce-homework-resistance",
    "develop-growth-mindset",
  ],
  "infant-problems": INFANT_PROBLEMS.map((p) => p.id),
  "parenting-challenges": [
    "manage-grandparents-interference",
    "align-parenting-between-parents",
    "handle-working-parent-guilt",
    "set-consistent-family-rules",
  ],
  "toddler-behavior": [
    "toddler-tantrums",
    "hitting-biting",
    "no-phase",
    "public-meltdowns",
    "whining-and-clinginess",
  ],
  "daily-skills": [
    "potty-training-readiness",
    "potty-day-training",
    "potty-night-training",
    "potty-public-anxiety",
    "self-dressing",
  ],
  "family-dynamics": [
    "sibling-rivalry",
    "sharing-turn-taking",
    "new-baby-adjustment",
    "sibling-fights",
    "favouritism-feelings",
  ],
  "special-situations": [
    "travel-with-kids",
    "hospital-doctor-visit",
    "daycare-school-transition",
    "welcoming-new-sibling",
    "moving-houses",
  ],
  "kids-health-concern": [
    "child-obesity-management",
    "nutrition-deficiency",
    "boost-immunity",
    "dental-health",
    "digital-health-eye-care",
    "early-milestones-0-5",
  ],
  "for-you": [
    "parent-burnout",
    "stay-calm-anger",
    "guilt-after-yelling",
    "find-me-time",
    "couple-time-balance",
    "improve-own-sleep",
    "manage-overwhelm",
  ],
};

const GOAL_TO_CATEGORY: Record<string, string> = {};
for (const [categoryId, goalIds] of Object.entries(COACH_CATEGORY_GOAL_IDS)) {
  for (const goalId of goalIds) {
    GOAL_TO_CATEGORY[goalId] = categoryId;
  }
}

const FREE_SAMPLE_BY_CATEGORY = new Map<string, string>(
  Object.entries(COACH_CATEGORY_GOAL_IDS).map(([categoryId, goalIds]) => [
    categoryId,
    goalIds[0] ?? "",
  ]),
);

export function coachGoalCategoryId(goalId: string): string {
  return GOAL_TO_CATEGORY[goalId] ?? "";
}

export function goalsInCoachCategory(categoryId: string): readonly string[] {
  return COACH_CATEGORY_GOAL_IDS[categoryId] ?? [];
}

export function coachCategoryGoalCount(categoryId: string): number {
  return goalsInCoachCategory(categoryId).length;
}

export function totalCoachGoalCount(): number {
  return Object.values(COACH_CATEGORY_GOAL_IDS).reduce(
    (sum, ids) => sum + ids.length,
    0,
  );
}

/** First goal in each category — the free sample for non-premium users. */
export function freeSampleCoachGoalId(categoryId: string): string | null {
  const id = FREE_SAMPLE_BY_CATEGORY.get(categoryId);
  return id || null;
}

export function isFreeSampleCoachGoal(goalId: string): boolean {
  const categoryId = coachGoalCategoryId(goalId);
  if (!categoryId) return false;
  return freeSampleCoachGoalId(categoryId) === goalId;
}

export function goalIndexInCoachCategory(goalId: string): number {
  const categoryId = coachGoalCategoryId(goalId);
  if (!categoryId) return -1;
  return goalsInCoachCategory(categoryId).indexOf(goalId);
}
