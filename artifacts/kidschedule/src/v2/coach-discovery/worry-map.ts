/**
 * Guest worry → Amy Coach free-sample goal (earned Coach card only).
 * Reuses @workspace/coach-journey catalog ids — no duplicate goal list.
 */

import { freeSampleCoachGoalId, coachGoalCategoryId } from "@workspace/coach-journey";
import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";

export type CoachDiscoveryOffer = {
  worryId: FrontDoorWorryId;
  categoryId: string;
  goalId: string;
  goalTitle: string;
  challengeLabel: string;
};

/** Worries that earn a Coach card — not speech (Today Mission wedge), not something_else. */
const COACH_WORRY_CATEGORY: Partial<
  Record<FrontDoorWorryId, { categoryId: string; challengeLabel: string }>
> = {
  behavior: { categoryId: "behavior", challengeLabel: "Behaviour & tantrums" },
  sleep: { categoryId: "sleep", challengeLabel: "Sleep" },
  feeding: { categoryId: "eating", challengeLabel: "Eating" },
  learning_school: { categoryId: "learning", challengeLabel: "Learning & focus" },
  mornings: { categoryId: "learning", challengeLabel: "Mornings & routines" },
};

const GOAL_TITLES: Record<string, string> = {
  "manage-tantrums": "Manage Tantrums",
  "toddler-tantrums": "Toddler Tantrums",
  "improve-sleep-patterns": "Improve Sleep Patterns",
  "encourage-independent-eating": "Encourage Independent Eating",
  "boost-concentration": "Boost Concentration",
};

function resolveCategoryId(
  worryId: FrontDoorWorryId,
  ageBand: FrontDoorAgeBand | null | undefined,
): string | null {
  const base = COACH_WORRY_CATEGORY[worryId];
  if (!base) return null;
  if (
    worryId === "behavior" &&
    (ageBand === "toddler_1_2" || ageBand === "preschool_3_5")
  ) {
    return "toddler-behavior";
  }
  return base.categoryId;
}

/** Null when this guest should not see the Coach card. */
export function resolveCoachDiscoveryOffer(input: {
  worry: FrontDoorWorryId | null | undefined;
  ageBand?: FrontDoorAgeBand | null;
}): CoachDiscoveryOffer | null {
  const worry = input.worry;
  if (!worry) return null;
  const meta = COACH_WORRY_CATEGORY[worry];
  if (!meta) return null;

  const categoryId = resolveCategoryId(worry, input.ageBand ?? null);
  if (!categoryId) return null;

  const goalId = freeSampleCoachGoalId(categoryId);
  if (!goalId) return null;

  const goalTitle =
    GOAL_TITLES[goalId] ??
    goalId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return {
    worryId: worry,
    categoryId: coachGoalCategoryId(goalId) || categoryId,
    goalId,
    goalTitle,
    challengeLabel: meta.challengeLabel,
  };
}

export function isCoachDiscoveryEligible(input: {
  worry: FrontDoorWorryId | null | undefined;
  ageBand?: FrontDoorAgeBand | null;
}): boolean {
  return resolveCoachDiscoveryOffer(input) != null;
}
