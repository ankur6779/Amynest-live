import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import {
  buildWeakSoundsProfile,
  sortItemsForSmartReview,
} from "@/lib/phonics-journey-adaptive";
import type { PhonicsV2FamilyProgress } from "./family-progress";
import { WORD_FAMILIES } from "./content/word-families";
import type { PhonicsV2PronunciationScores } from "./pronunciation-scores";

export type ParentPhonicsInsight = {
  strongSounds: string[];
  needsPracticeSounds: string[];
  strongFamilies: string[];
  needsPracticeFamilies: string[];
  recommendedWords: string[];
  confidenceLabel: string;
  summaryLine: string;
};

const STRONG_PHONEMES = ["m", "s", "t", "p", "b"];

export function buildParentPhonicsInsights(opts: {
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  familyProgress: PhonicsV2FamilyProgress;
  pronunciation?: PhonicsV2PronunciationScores;
}): ParentPhonicsInsight {
  const weak = buildWeakSoundsProfile([], opts.progress, opts.items);
  const needsPracticeSounds = weak.sounds.slice(0, 3);

  const strongSounds = STRONG_PHONEMES.filter(
    (p) => !needsPracticeSounds.some((w) => w.toLowerCase().includes(p)),
  ).slice(0, 4);

  const strongFamilies: string[] = [];
  const needsPracticeFamilies: string[] = [];
  for (const f of WORD_FAMILIES) {
    const fp = opts.familyProgress[f.id];
    if (fp?.status === "mastered") strongFamilies.push(f.suffix);
    else if (fp?.status === "practicing") needsPracticeFamilies.push(f.suffix);
  }
  if (needsPracticeFamilies.length === 0 && WORD_FAMILIES[1]) {
    needsPracticeFamilies.push(WORD_FAMILIES[1]!.suffix);
  }

  const recommended = sortItemsForSmartReview(
    opts.items,
    opts.progress,
    needsPracticeSounds,
    "balanced",
  )
    .slice(0, 3)
    .map((it) => it.symbol);

  const conf = opts.pronunciation?.confidenceAvg ?? 0;
  const confidenceLabel =
    conf >= 75 ? "Growing confidence" : conf >= 45 ? "Building confidence" : "Just starting";

  const summaryLine =
    needsPracticeSounds.length > 0
      ? `Focus on ${needsPracticeSounds[0]} sounds today — ${recommended[0] ?? "practice"} is a great start.`
      : `${strongFamilies[0] ?? "-at"} family is going well — try a new story tonight.`;

  return {
    strongSounds,
    needsPracticeSounds,
    strongFamilies,
    needsPracticeFamilies,
    recommendedWords: recommended,
    confidenceLabel,
    summaryLine,
  };
}
