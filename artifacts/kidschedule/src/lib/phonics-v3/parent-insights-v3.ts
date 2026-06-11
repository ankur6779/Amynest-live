/**
 * Advanced parent insights — mastery, fluency, and actionable next steps.
 */
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsV2FamilyProgress } from "@/lib/phonics-v2/family-progress";
import type { PhonicsV2PronunciationScores } from "@/lib/phonics-v2/pronunciation-scores";
import { WORD_FAMILIES } from "@/lib/phonics-v2/content/word-families";
import type { PhonicsMasteryState } from "./mastery-engine";
import { buildWeakSkillProfile } from "./adaptive-selector";
import type { PhonicsFluencyState } from "./fluency-tracker";
import { fluencyTrend } from "./fluency-tracker";
import {
  computeRetentionPct,
  getOverdueTracks,
  getSkillsAtRisk,
  getStrongestRetained,
  type PhonicsRetentionState,
} from "./spaced-repetition";
import { CERTIFIED_DIGRAPH_IDS } from "./content/digraph-catalog";
import { getDigraphRetentionOverdue } from "./content/digraph-adaptive";
import { getUnlockedDigraphs } from "./content/digraph-pathway";

export type ParentInsightV3 = {
  summaryLine: string;
  confidenceLabel: string;
  strongSounds: string[];
  needsPracticeSounds: string[];
  strongFamilies: string[];
  weakFamilies: string[];
  readingConfidence: number;
  storyCompletionPct: number;
  pronunciationProgress: number;
  weeklyGrowth: number;
  recommendedActivities: string[];
  fluency7d: number;
  fluency30d: number;
  fluency90d: number;
  readingStreak: number;
  masteredWords: number;
  retentionPct: number;
  overdueReviewCount: number;
  skillsAtRisk: string[];
  strongestRetained: string[];
  digraphProgress: Array<{
    id: string;
    unlocked: boolean;
    overdueReviews: number;
    weakWords: number;
  }>;
  weakDigraphs: string[];
};

export function buildParentInsightsV3(opts: {
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  familyProgress: PhonicsV2FamilyProgress;
  pronunciation?: PhonicsV2PronunciationScores;
  mastery: PhonicsMasteryState;
  fluency: PhonicsFluencyState;
  retention?: PhonicsRetentionState;
}): ParentInsightV3 {
  const profile = buildWeakSkillProfile(opts.mastery, opts.items, opts.progress);

  const strongSounds = Object.values(opts.mastery.letters)
    .filter((r) => r.score >= 70)
    .map((r) => r.id)
    .slice(0, 8);

  const needsPracticeSounds =
    profile.weakLetters.length > 0
      ? profile.weakLetters.slice(0, 6)
      : profile.weakPhonemes.slice(0, 6);

  const strongFamilies = WORD_FAMILIES.filter((f) => {
    const rec = opts.mastery.families[f.id];
    return (rec?.score ?? 0) >= 70 || opts.familyProgress[f.id]?.status === "mastered";
  }).map((f) => f.suffix);

  const weakFamilies = WORD_FAMILIES.filter((f) => {
    const rec = opts.mastery.families[f.id];
    return (rec?.score ?? 0) < 50;
  }).map((f) => f.suffix);

  const masteredWords = Object.values(opts.mastery.words).filter((w) => w.isMastered).length;
  const masteryAvg =
    Object.values(opts.mastery.words).length > 0
      ? Math.round(
          Object.values(opts.mastery.words).reduce((s, r) => s + r.score, 0) /
            Object.values(opts.mastery.words).length,
        )
      : 0;
  const unlockedDigraphs = getUnlockedDigraphs(masteryAvg);
  const digraphProgress = CERTIFIED_DIGRAPH_IDS.map((id) => {
    const overdue = opts.retention ? getDigraphRetentionOverdue(id, opts.retention).length : 0;
    const weakWords = (opts.mastery.phonemes[id]?.score ?? 0) < 60 ? 1 : 0;
    return {
      id,
      unlocked: unlockedDigraphs.some((d) => d.id === id),
      overdueReviews: overdue,
      weakWords,
    };
  });
  const weakDigraphs = digraphProgress
    .filter((d) => d.unlocked && (d.overdueReviews > 0 || d.weakWords > 0))
    .map((d) => d.id);
  const retentionPct = opts.retention ? computeRetentionPct(opts.retention) : 0;
  const overdueReviewCount = opts.retention ? getOverdueTracks(opts.retention).length : 0;
  const skillsAtRisk = opts.retention
    ? getSkillsAtRisk(opts.retention).map((t) => t.id).slice(0, 6)
    : [];
  const strongestRetained = opts.retention
    ? getStrongestRetained(opts.retention).map((t) => t.id).slice(0, 6)
    : [];
  const pronunciationProgress = opts.pronunciation?.confidenceAvg ?? 0;

  const t7 = fluencyTrend(opts.fluency, 7);
  const t30 = fluencyTrend(opts.fluency, 30);
  const t90 = fluencyTrend(opts.fluency, 90);

  const weeklyGrowth =
    t7.avgScore > 0 && t30.avgScore > 0
      ? Math.round(((t7.avgScore - t30.avgScore) / t30.avgScore) * 100)
      : t7.wordsCompleted;

  const storyCompletionPct = Math.min(
    100,
    Math.round((opts.fluency.storiesCompletedTotal / Math.max(1, 20)) * 100),
  );

  const readingConfidence = Math.round(
    (t7.avgScore * 0.4 + pronunciationProgress * 0.3 + Math.min(100, masteredWords * 5) * 0.3),
  );

  const recommendedActivities: string[] = [];
  if (overdueReviewCount > 0) {
    recommendedActivities.push(`Complete ${overdueReviewCount} overdue retention review${overdueReviewCount > 1 ? "s" : ""}`);
  }
  if (skillsAtRisk[0]) {
    recommendedActivities.push(`Strengthen at-risk word: "${skillsAtRisk[0]}"`);
  }
  if (weakDigraphs[0]) {
    recommendedActivities.push(`Digraph practice: ${weakDigraphs[0]} pathway`);
  }
  if (profile.weakWords[0]) {
    recommendedActivities.push(`Blend practice: "${profile.weakWords[0]}"`);
  }
  if (profile.weakFamilies[0]) {
    const fam = WORD_FAMILIES.find((f) => f.id === profile.weakFamilies[0]);
    if (fam) recommendedActivities.push(`${fam.title} word family`);
  }
  if (t7.storiesCompleted < 2) {
    recommendedActivities.push("Read one decodable story today");
  }
  if (pronunciationProgress < 60) {
    recommendedActivities.push("Voice round — say words aloud");
  }
  if (recommendedActivities.length === 0) {
    recommendedActivities.push("Daily mission — keep the streak going!");
  }

  const summaryLine =
    overdueReviewCount > 0
      ? `${overdueReviewCount} overdue review${overdueReviewCount > 1 ? "s" : ""} — retention at ${retentionPct}%.`
      : weakFamilies.length > 0
        ? `Focus on ${weakFamilies.slice(0, 2).join(" and ")} families next. ${masteredWords} words truly mastered.`
        : `${masteredWords} words mastered. Retention ${retentionPct}% · confidence ${readingConfidence}%.`;

  return {
    summaryLine,
    confidenceLabel: readingConfidence >= 70 ? "Growing reader" : "Building foundations",
    strongSounds: strongSounds.length > 0 ? strongSounds : ["s", "a", "t"],
    needsPracticeSounds:
      needsPracticeSounds.length > 0 ? needsPracticeSounds : ["review daily mission"],
    strongFamilies,
    weakFamilies,
    readingConfidence,
    storyCompletionPct,
    pronunciationProgress,
    weeklyGrowth,
    recommendedActivities: recommendedActivities.slice(0, 4),
    fluency7d: t7.avgScore,
    fluency30d: t30.avgScore,
    fluency90d: t90.avgScore,
    readingStreak: opts.fluency.streakDays,
    masteredWords,
    retentionPct,
    overdueReviewCount,
    skillsAtRisk,
    strongestRetained,
    digraphProgress,
    weakDigraphs,
  };
}
