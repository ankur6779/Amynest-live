/**
 * Canonical content ownership — one introduction, many reinforcements, one assessment.
 */
import type { CurriculumLevel } from "./types.js";

export type ReinforcementSurface =
  | "learning_pack"
  | "karaoke"
  | "daily_mission"
  | "word_family"
  | "phonics_games"
  | "digraph_lesson"
  | "digraph_story"
  | "blend_story"
  | "cvcc_story"
  | "decodable_story"
  | "spaced_review";

export type AssessmentSurface =
  | "daily_test"
  | "weekly_test"
  | "digraph_assessment"
  | "v3_mastery";

export interface ContentOwnership {
  introducedAt: CurriculumLevel;
  reinforcedIn: ReinforcementSurface[];
  assessedIn: AssessmentSurface[];
}

/** Representative entries; word-level entries share the same level owner. */
export const PHONICS_CONTENT_OWNERSHIP: Record<string, ContentOwnership> = {
  letter_gpc: {
    introducedAt: 1,
    reinforcedIn: ["learning_pack", "phonics_games"],
    assessedIn: ["daily_test"],
  },
  cvc_decode: {
    introducedAt: 2,
    reinforcedIn: ["learning_pack", "karaoke", "daily_mission", "phonics_games", "spaced_review"],
    assessedIn: ["daily_test", "v3_mastery"],
  },
  word_family: {
    introducedAt: 3,
    reinforcedIn: ["word_family", "phonics_games", "decodable_story"],
    assessedIn: ["daily_test", "weekly_test"],
  },
  digraph: {
    introducedAt: 4,
    reinforcedIn: ["digraph_lesson", "digraph_story", "daily_mission", "spaced_review"],
    assessedIn: ["digraph_assessment", "daily_test"],
  },
  consonant_blend: {
    introducedAt: 5,
    reinforcedIn: ["blend_story", "daily_mission", "karaoke", "spaced_review"],
    assessedIn: ["daily_test", "weekly_test"],
  },
  cvcc: {
    introducedAt: 6,
    reinforcedIn: ["cvcc_story", "daily_mission", "spaced_review"],
    assessedIn: ["daily_test", "weekly_test"],
  },
  sight_word: {
    introducedAt: 7,
    reinforcedIn: ["learning_pack", "decodable_story"],
    assessedIn: ["daily_test"],
  },
  fluency_sentence: {
    introducedAt: 7,
    reinforcedIn: ["decodable_story", "daily_mission"],
    assessedIn: ["daily_test", "weekly_test"],
  },
};

export function ownershipForWord(word: string): ContentOwnership {
  const w = word.trim().toLowerCase();
  if (["the", "and", "is", "it", "to"].includes(w)) return PHONICS_CONTENT_OWNERSHIP.sight_word!;
  if (w.length === 1) return PHONICS_CONTENT_OWNERSHIP.letter_gpc!;
  return PHONICS_CONTENT_OWNERSHIP.cvc_decode!;
}
