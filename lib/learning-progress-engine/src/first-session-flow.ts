/**
 * Continuous Optimization — First session flow.
 *
 * Reshapes the regular `DailyLearningSession` into a deliberately easy,
 * success-shaped first arc. The first 5 minutes after onboarding are the
 * most fragile — this module trims items and softens copy.
 *
 * Uses existing daily-session output as input. Does NOT introduce a new
 * session engine; it reshapes the existing one.
 */

import type { DailyLearningSession, DailySessionItem } from "./daily-session";
import type { SectionKey } from "./types";

export interface FirstSessionOptions {
  /** Result of `buildDailyLearningSession()` — we trim/reorder this. */
  daily: DailyLearningSession;
  childName?: string;
  /** True when the device tier suggests lighter motion / fewer steps. */
  lightVisuals?: boolean;
}

export interface FirstSessionFlow {
  items: DailySessionItem[];
  encouragement: {
    intro: string;
    midway: string;
    finale: string;
  };
  tomorrowTeaser: string;
  rewardIntensity: "subtle" | "card";
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

/**
 * Order sections from easiest to hardest for a fresh learner. Play +
 * stories feel like wins before math / worksheets. This is the only
 * place that should encode "first-session easiness".
 */
const FIRST_SESSION_DIFFICULTY: Record<SectionKey, number> = {
  stories: 0,
  speech: 1,
  phonics: 1,
  creativity: 1,
  puzzles: 2,
  math: 2,
  memory: 2,
  lifeSkills: 3,
  worksheets: 3,
  spelling: 4,
};

function difficultyWeight(item: DailySessionItem): number {
  return FIRST_SESSION_DIFFICULTY[item.section] ?? 4;
}

/**
 * Build a softened first-session flow:
 *   - 2–3 items maximum
 *   - easiest available first ("warm-in")
 *   - subtle celebrations, not full bursts
 */
export function buildFirstSessionFlow(opts: FirstSessionOptions): FirstSessionFlow {
  const name = NAME(opts.childName);
  const items = [...opts.daily.items].sort(
    (a, b) => difficultyWeight(a) - difficultyWeight(b),
  );

  const maxItems = opts.lightVisuals ? 2 : 3;
  const trimmed = items.slice(0, maxItems);

  return {
    items: trimmed,
    encouragement: {
      intro: `A small, cozy start for ${name} — we'll keep it simple today.`,
      midway: `Beautiful — ${name} is already finding their rhythm.`,
      finale: `That's a finished first moment. The hardest step is done.`,
    },
    tomorrowTeaser: `Tomorrow Amy will gently build on what ${name} just enjoyed.`,
    rewardIntensity: opts.lightVisuals ? "subtle" : "card",
  };
}

/**
 * Detect whether a first session counts as a successful "first win". Used
 * by the host to decide whether to trigger the first-session celebration.
 */
export function isFirstSessionSuccess(input: {
  totalSteps: number;
  completedSteps: number;
}): boolean {
  if (input.totalSteps <= 0) return false;
  return input.completedSteps >= Math.min(2, input.totalSteps);
}
