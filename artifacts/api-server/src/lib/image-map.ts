// Zero-cost predefined image mapping for AI Parenting Coach.
// Keyed by goal slug. Uses picsum.photos with stable seeds (real photographs, free, fast).
// 12 images per goal so each win in a 10–12 win plan gets a distinct visual.

const SIZE = "800/600";
const u = (seed: string): string =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${SIZE}`;

const range = (prefix: string, n = 12): string[] =>
  Array.from({ length: n }, (_, i) => u(`${prefix}-${i + 1}`));

export const GOAL_IDS = [
  // ── Behavior ───────────────────────────────────────────────
  "manage-tantrums",
  "handle-aggression",
  "reduce-defiance",
  "emotional-regulation",
  "separation-anxiety",
  "change-stubborn-behaviour", // legacy (kept for cache compat)

  // ── Screen & Focus ────────────────────────────────────────
  "balance-screen-time",
  "reduce-mobile-addiction",
  "improve-focus-span",
  "reduce-shorts-overuse",
  "reduce-instant-gratification",

  // ── Eating ────────────────────────────────────────────────
  "encourage-independent-eating",
  "navigate-fussy-eating",
  "stop-junk-food-craving",
  "healthy-eating-routine",
  "improve-mealtime-behavior",

  // ── Sleep ─────────────────────────────────────────────────
  "improve-sleep-patterns",
  "fix-bedtime-resistance",
  "stop-night-waking",
  "consistent-sleep-routine",
  "reduce-late-sleeping",

  // ── Learning ──────────────────────────────────────────────
  "boost-concentration",
  "build-study-discipline",
  "increase-learning-interest",
  "reduce-homework-resistance",
  "develop-growth-mindset",

  // ── Parenting Challenges ──────────────────────────────────
  "manage-grandparents-interference",
  "align-parenting-between-parents",
  "handle-working-parent-guilt",
  "set-consistent-family-rules",

  // ── Toddler Behavior (2-4 yrs) ────────────────────────────
  "toddler-tantrums",
  "hitting-biting",
  "no-phase",
  "public-meltdowns",
  "whining-and-clinginess",

  // ── Daily Skills & Independence ───────────────────────────
  "potty-training-readiness",
  "potty-day-training",
  "potty-night-training",
  "potty-public-anxiety",
  "self-dressing",

  // ── Family Dynamics ───────────────────────────────────────
  "sibling-rivalry",
  "sharing-turn-taking",
  "new-baby-adjustment",
  "sibling-fights",
  "favouritism-feelings",

  // ── Special Situations ────────────────────────────────────
  "travel-with-kids",
  "hospital-doctor-visit",
  "daycare-school-transition",
  "welcoming-new-sibling",
  "moving-houses",

  // ── For You (Parent Self-Care) ────────────────────────────
  "parent-burnout",
  "stay-calm-anger",
  "guilt-after-yelling",
  "find-me-time",
  "couple-time-balance",
  "improve-own-sleep",
  "manage-overwhelm",

  // ── Kids Health Concern (research & science-based) ────────
  "child-obesity-management",
  "nutrition-deficiency",
  "boost-immunity",
  "dental-health",
  "digital-health-eye-care",
  "early-milestones-0-5",
] as const;

export type GoalId = (typeof GOAL_IDS)[number];

export const imageMap: Record<string, string[]> = {
  "balance-screen-time":          range("amy-screen"),
  "manage-tantrums":              range("amy-tantrum"),
  "change-stubborn-behaviour":    range("amy-stubborn"),
  "improve-sleep-patterns":       range("amy-sleep"),
  "encourage-independent-eating": range("amy-indep-eat"),
  "boost-concentration":          range("amy-focus"),
  "navigate-fussy-eating":        range("amy-fussy"),
  default:                        range("amy-default"),
};

export function getImagesForGoal(goalId: string): string[] {
  return imageMap[goalId] ?? imageMap.default;
}

export function attachImagesToWins<T extends { image?: string }>(
  wins: T[],
  goalId: string
): T[] {
  const images = getImagesForGoal(goalId);
  return wins.map((w, i) => ({ ...w, image: images[i % images.length] }));
}
