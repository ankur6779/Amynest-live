/**
 * Phonics V2 journey map — six visual stages for early-reading progression.
 * Maps to existing curriculum levels without replacing V1 PHONICS_JOURNEY_STAGES.
 */

export type PhonicsV2StageId =
  | "letter_sounds"
  | "blending_practice"
  | "cvc_words"
  | "word_families"
  | "mini_sentences"
  | "reading_stories";

export type PhonicsV2StageStatus = "locked" | "available" | "completed";

export type PhonicsV2Stage = {
  id: PhonicsV2StageId;
  order: number;
  title: string;
  subtitle: string;
  emoji: string;
  /** Curriculum levels that satisfy this stage */
  curriculumLevels: number[];
  scrollTarget: string;
  activityKind: "letters" | "blend" | "cvc" | "families" | "sentences" | "stories";
};

export const PHONICS_V2_STAGES: PhonicsV2Stage[] = [
  {
    id: "letter_sounds",
    order: 1,
    title: "Letter Sounds",
    subtitle: "Hear each letter sound",
    emoji: "🔤",
    curriculumLevels: [1],
    scrollTarget: "phonics-v2-stage-letters",
    activityKind: "letters",
  },
  {
    id: "blending_practice",
    order: 2,
    title: "Blending Practice",
    subtitle: "Blend sounds slowly",
    emoji: "🎵",
    curriculumLevels: [2],
    scrollTarget: "phonics-v2-karaoke",
    activityKind: "blend",
  },
  {
    id: "cvc_words",
    order: 3,
    title: "CVC Words",
    subtitle: "Read simple words",
    emoji: "🧩",
    curriculumLevels: [2, 3],
    scrollTarget: "phonics-v2-cvc",
    activityKind: "cvc",
  },
  {
    id: "word_families",
    order: 4,
    title: "Word Families",
    subtitle: "Spot the pattern",
    emoji: "👨‍👩‍👧‍👦",
    curriculumLevels: [3, 4],
    scrollTarget: "phonics-v2-families",
    activityKind: "families",
  },
  {
    id: "mini_sentences",
    order: 5,
    title: "Mini Sentences",
    subtitle: "Short reads together",
    emoji: "📝",
    curriculumLevels: [4, 5],
    scrollTarget: "phonics-v2-sentences",
    activityKind: "sentences",
  },
  {
    id: "reading_stories",
    order: 6,
    title: "Reading Stories",
    subtitle: "Decodable story time",
    emoji: "📚",
    curriculumLevels: [5, 6],
    scrollTarget: "phonics-v2-stories",
    activityKind: "stories",
  },
];

export function resolveV2ActiveStage(
  curriculumLevel: number | null | undefined,
  totalAgeMonths: number,
): PhonicsV2Stage {
  let level = curriculumLevel ?? 1;
  if (curriculumLevel == null) {
    if (totalAgeMonths < 24) level = 1;
    else if (totalAgeMonths < 36) level = 1;
    else if (totalAgeMonths < 48) level = 2;
    else if (totalAgeMonths < 60) level = 4;
    else level = 5;
  }
  const match =
    [...PHONICS_V2_STAGES].reverse().find((s) => s.curriculumLevels.some((l) => l <= level)) ??
    PHONICS_V2_STAGES[0]!;
  return match;
}

export function resolveV2StageStatus(
  stage: PhonicsV2Stage,
  active: PhonicsV2Stage,
  masteredStageOrders: number[],
): PhonicsV2StageStatus {
  if (masteredStageOrders.includes(stage.order)) return "completed";
  if (stage.order < active.order) return "completed";
  if (stage.order === active.order) return "available";
  if (stage.order === active.order + 1) return "available";
  return "locked";
}

export function computeV2JourneyPct(
  masteredCount: number,
  totalStages = PHONICS_V2_STAGES.length,
): number {
  return Math.round(Math.min(100, (masteredCount / totalStages) * 100));
}
