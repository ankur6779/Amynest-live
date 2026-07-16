/**
 * Phonics V2 journey map — aligned to canonical curriculum levels 1–7.
 */
import type { CurriculumLevel } from "@workspace/phonics-curriculum";
import type { JourneyStageStatus } from "../journey-progression";

export type PhonicsV2StageId =
  | "letter_sounds"
  | "cvc_decoding"
  | "word_families"
  | "digraphs"
  | "consonant_blends"
  | "cvcc"
  | "fluency_stories";

export type PhonicsV2StageStatus = JourneyStageStatus;

/** @deprecated Use JourneyStageStatus from journey-progression.ts */
export type LegacyPhonicsV2StageStatus = "locked" | "available" | "completed";

export type PhonicsV2Stage = {
  id: PhonicsV2StageId;
  order: number;
  title: string;
  subtitle: string;
  emoji: string;
  curriculumLevels: CurriculumLevel[];
  scrollTarget: string;
  activityKind: "letters" | "cvc" | "families" | "digraphs" | "blends" | "cvcc" | "stories";
};

export const PHONICS_V2_STAGES: PhonicsV2Stage[] = [
  {
    id: "letter_sounds",
    order: 1,
    title: "SATPIN Sounds",
    subtitle: "Learn sounds in groups — blend words early",
    emoji: "🔤",
    curriculumLevels: [1],
    scrollTarget: "phonics-practice-sounds",
    activityKind: "letters",
  },
  {
    id: "cvc_decoding",
    order: 2,
    title: "CVC Decoding",
    subtitle: "Blend and read more words",
    emoji: "🧩",
    curriculumLevels: [2],
    scrollTarget: "phonics-v2-karaoke",
    activityKind: "cvc",
  },
  {
    id: "word_families",
    order: 3,
    title: "Word Families",
    subtitle: "Spot the pattern",
    emoji: "👨‍👩‍👧‍👦",
    curriculumLevels: [3],
    scrollTarget: "phonics-v2-families",
    activityKind: "families",
  },
  {
    id: "digraphs",
    order: 4,
    title: "Digraphs",
    subtitle: "sh, ch, th and more",
    emoji: "🔡",
    curriculumLevels: [4],
    scrollTarget: "phonics-v2-digraphs",
    activityKind: "digraphs",
  },
  {
    id: "consonant_blends",
    order: 5,
    title: "Consonant Blends",
    subtitle: "Read blend words",
    emoji: "🌿",
    curriculumLevels: [5],
    scrollTarget: "phonics-v2-digraphs",
    activityKind: "blends",
  },
  {
    id: "cvcc",
    order: 6,
    title: "CVCC Words",
    subtitle: "Four-letter words",
    emoji: "📘",
    curriculumLevels: [6],
    scrollTarget: "phonics-v2-stories",
    activityKind: "cvcc",
  },
  {
    id: "fluency_stories",
    order: 7,
    title: "Fluency & Stories",
    subtitle: "Read with confidence",
    emoji: "📚",
    curriculumLevels: [7],
    scrollTarget: "phonics-v2-stories",
    activityKind: "stories",
  },
];

/** @deprecated Use resolveCurrentTargetStage from journey-progression.ts */
export function resolveV2ActiveStage(
  curriculumLevel: number | null | undefined,
  totalAgeMonths: number,
): PhonicsV2Stage {
  let level = curriculumLevel ?? 1;
  if (curriculumLevel == null) {
    if (totalAgeMonths < 24) level = 1;
    else if (totalAgeMonths < 36) level = 1;
    else if (totalAgeMonths < 48) level = 2;
    else if (totalAgeMonths < 60) level = 3;
    else level = 4;
  }
  const match =
    [...PHONICS_V2_STAGES].reverse().find((s) => s.curriculumLevels.some((l) => l <= level)) ??
    PHONICS_V2_STAGES[0]!;
  return match;
}

/** @deprecated Use resolveJourneyStageStatus from journey-progression.ts */
export function resolveV2StageStatus(
  stage: PhonicsV2Stage,
  active: PhonicsV2Stage,
  masteredStageOrders: number[],
): LegacyPhonicsV2StageStatus {
  if (masteredStageOrders.includes(stage.order)) return "completed";
  if (stage.order < active.order) return "completed";
  if (stage.order === active.order) return "available";
  if (stage.order === active.order + 1) return "available";
  return "locked";
}

/** @deprecated Use computeMasteryBasedJourneyPct from journey-progression.ts */
export function computeV2JourneyPct(
  masteredCount: number,
  totalStages = PHONICS_V2_STAGES.length,
): number {
  return Math.round(Math.min(100, (masteredCount / totalStages) * 100));
}
