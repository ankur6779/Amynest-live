/**
 * Continuous Optimization — Premium conversion.
 *
 * Generates milestone-based, warm, contextual premium prompts. Never
 * aggressive, never urgent, never interruptive.
 *
 * Rules (hard):
 *  - Prompts only at meaningful family moments (streaks, mastery jumps,
 *    skill graph milestones), never on every screen.
 *  - One prompt at a time. Hosts persist the `lastPromptIso` and the
 *    set of `seenPromptIds` to honor cooldowns.
 *  - Copy frames premium as a *deepening* of the existing family journey,
 *    not a fear of losing something.
 *  - No discount/scarcity copy. No "act now". No countdown.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";

export type PremiumPromptKind =
  | "first_week_growth"
  | "mastery_threshold"
  | "skill_graph_expanding"
  | "comeback_anchor"
  | "long_streak_recognition"
  | "speech_journey_deepening";

export interface PremiumPrompt {
  id: PremiumPromptKind;
  title: string;
  message: string;
  /** What premium will *enable*, in family-journey language. */
  unlocksLine: string;
  emoji: string;
  /** CTA label — always warm. */
  ctaLabel: string;
  /** When true the prompt is high-confidence; hosts may show it. */
  ready: boolean;
}

export interface PremiumConversionInput {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  isPremium: boolean;
  /** ISO date of the last premium prompt shown (host-persisted). */
  lastPromptIso?: string | null;
  /** Prompt ids already shown to this family — never repeat. */
  seenPromptIds?: PremiumPromptKind[];
  /** Today's ISO date — defaults to now. */
  todayIso?: string;
  childName?: string;
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

/** Minimum days between premium prompts. */
export const PREMIUM_PROMPT_COOLDOWN_DAYS = 7;

function daysSince(iso?: string | null, ref?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const a = Date.parse(iso);
  const b = ref ? Date.parse(ref) : Date.now();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return (b - a) / 86_400_000;
}

function build(kind: PremiumPromptKind, name: string): PremiumPrompt {
  switch (kind) {
    case "first_week_growth":
      return {
        id: kind,
        emoji: "🌱",
        title: "A beautiful first week",
        message: `${name} found a rhythm — Amy can now help that rhythm grow gently.`,
        unlocksLine: `Personalize ${name}'s next learning stages around what's working.`,
        ctaLabel: "Deepen the journey",
        ready: true,
      };
    case "mastery_threshold":
      return {
        id: kind,
        emoji: "✨",
        title: "Confidence is showing",
        message: `${name}'s mastery is steady. Amy can now design tomorrow more precisely.`,
        unlocksLine: `Adaptive practice tuned to ${name}'s growing strengths.`,
        ctaLabel: "See what's next",
        ready: true,
      };
    case "skill_graph_expanding":
      return {
        id: kind,
        emoji: "🪄",
        title: `${name}'s skill map is opening up`,
        message: `New skills are forming. Amy can now connect them into a longer arc.`,
        unlocksLine: `Personalized skill paths across phonics, math, speech and stories.`,
        ctaLabel: "Open the full path",
        ready: true,
      };
    case "comeback_anchor":
      return {
        id: kind,
        emoji: "🌈",
        title: "A warm comeback",
        message: `${name} came back — that's the moment to make next time easier.`,
        unlocksLine: `Gentle, personalized re-entry sessions for whenever life paused.`,
        ctaLabel: "Make returns easier",
        ready: true,
      };
    case "long_streak_recognition":
      return {
        id: kind,
        emoji: "🌟",
        title: "Something quiet and special",
        message: `${name}'s consistency this calm is rare. Amy would love to honor it with deeper personalization.`,
        unlocksLine: `Long-term personalization across ${name}'s learning journey.`,
        ctaLabel: "Honor the rhythm",
        ready: true,
      };
    case "speech_journey_deepening":
      return {
        id: kind,
        emoji: "🗣️",
        title: "Speech confidence is growing",
        message: `${name}'s voice is finding its rhythm — speech can be the next gentle chapter.`,
        unlocksLine: `Personalized speech practice shaped to ${name}'s clearest sounds.`,
        ctaLabel: "Open speech depth",
        ready: true,
      };
  }
}

/**
 * Decide whether (and which) premium prompt to surface. Returns `null`
 * when nothing meaningful is happening or the cooldown is active.
 */
export function evaluatePremiumPrompt(
  input: PremiumConversionInput,
): PremiumPrompt | null {
  if (input.isPremium) return null;

  const days = daysSince(input.lastPromptIso ?? undefined, input.todayIso);
  if (days < PREMIUM_PROMPT_COOLDOWN_DAYS) return null;

  const seen = new Set(input.seenPromptIds ?? []);
  const name = NAME(input.childName);
  const candidates: PremiumPromptKind[] = [];

  if (input.profile.streakDays >= 30) candidates.push("long_streak_recognition");
  if (input.profile.streakDays >= 7) candidates.push("first_week_growth");

  if (input.profile.masteryScore >= 55) candidates.push("mastery_threshold");
  if (input.memory.masteredSkills.length >= 4) candidates.push("skill_graph_expanding");
  if (
    input.memory.strongestCategory === "speech" &&
    input.profile.streakDays >= 3
  ) {
    candidates.push("speech_journey_deepening");
  }
  if (input.memory.sessionStreakDays >= 2 && input.profile.streakDays >= 1) {
    candidates.push("comeback_anchor");
  }

  // Prefer the most meaningful, unseen prompt.
  const ORDER: PremiumPromptKind[] = [
    "long_streak_recognition",
    "skill_graph_expanding",
    "speech_journey_deepening",
    "mastery_threshold",
    "first_week_growth",
    "comeback_anchor",
  ];

  for (const k of ORDER) {
    if (candidates.includes(k) && !seen.has(k)) {
      return build(k, name);
    }
  }
  return null;
}

/**
 * Convenience predicate — hosts can short-circuit before composing input.
 */
export function shouldConsiderPremiumPrompt(input: {
  isPremium: boolean;
  lastPromptIso?: string | null;
  todayIso?: string;
}): boolean {
  if (input.isPremium) return false;
  return daysSince(input.lastPromptIso ?? undefined, input.todayIso) >= PREMIUM_PROMPT_COOLDOWN_DAYS;
}
