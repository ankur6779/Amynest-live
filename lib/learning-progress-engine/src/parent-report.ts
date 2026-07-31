import type { LearningProgressProfile, WeeklyParentReport, SectionKey } from "./types";
import { NUMBERS_STAGES } from "./study-zone-progression";

export interface WeeklyReportInput {
  profile: LearningProgressProfile;
  previousWeek?: Partial<LearningProgressProfile>;
  speechScorePrev?: number;
  speechScoreNow?: number;
}

export function buildWeeklyParentReport(input: WeeklyReportInput): WeeklyParentReport {
  const { profile, previousWeek, speechScorePrev, speechScoreNow } = input;
  const now = new Date();
  const weekEnd = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

  const activitiesCompleted = profile.completedActivities.length;
  const newWords = profile.sectionProgress.phonics?.activitiesCompleted ?? 0;

  let countingImprovement: string | null = null;
  const prevMath = previousWeek?.sectionProgress?.math?.level ?? 0;
  const curMath = profile.sectionProgress.math?.level ?? 1;
  const prevStage = NUMBERS_STAGES[Math.min(prevMath, NUMBERS_STAGES.length - 1)];
  const curStage = NUMBERS_STAGES[Math.min(curMath, NUMBERS_STAGES.length - 1)];
  if (prevStage && curStage && prevStage.id !== curStage.id) {
    countingImprovement = `${prevStage.label} → ${curStage.label}`;
  } else if (curMath > prevMath) {
    countingImprovement = `Level ${prevMath} → ${curMath}`;
  }

  let pronunciationImprovementPct: number | null = null;
  if (
    speechScorePrev != null &&
    speechScoreNow != null &&
    speechScorePrev > 0
  ) {
    pronunciationImprovementPct = Math.round(
      ((speechScoreNow - speechScorePrev) / speechScorePrev) * 100,
    );
  }

  const highlights: string[] = [];
  if (profile.streakDays >= 5) {
    highlights.push(`${profile.streakDays}-day learning streak`);
  }
  if (newWords > 0) {
    highlights.push(`Learned ${newWords} new phonics activities`);
  }
  if (profile.masteryScore >= 50) {
    highlights.push(`Mastery score reached ${profile.masteryScore}%`);
  }

  const sectionGains: WeeklyParentReport["sectionGains"] = {};
  const keys: SectionKey[] = ["phonics", "reading", "math", "speech", "stories"];
  for (const k of keys) {
    const from = previousWeek?.sectionProgress?.[k]?.masteryPct ?? 0;
    const to = profile.sectionProgress[k]?.masteryPct ?? 0;
    if (to > from) sectionGains[k] = { from, to };
  }

  return {
    weekStart,
    weekEnd,
    newWordsLearned: Math.max(0, newWords),
    countingImprovement,
    pronunciationImprovementPct,
    activitiesCompleted,
    streakDays: profile.streakDays,
    highlights,
    sectionGains,
  };
}
