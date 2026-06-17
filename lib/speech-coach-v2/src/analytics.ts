import type { SpeechCoachV2ParentDashboard } from "./types";

export interface SpeechCoachV2SessionAnalytics {
  sessionId: string;
  childId: number;
  durationSeconds: number;
  wordsSpoken: number;
  sentencesCompleted: number;
  averageOverallScore: number;
  averageAccuracy: number;
  averageFluency: number;
  averageConfidence: number;
  completionRate: number;
  starsEarned: number;
  pointsEarned: number;
  badgesEarned: string[];
  phaseReached: string;
}

export function averageScore(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function computeTrend(values: number[], window = 7): number[] {
  if (values.length <= window) return values;
  return values.slice(-window);
}

export function weeklyImprovement(recent: number[], prior: number[]): number {
  if (recent.length === 0 || prior.length === 0) return 0;
  return averageScore(recent) - averageScore(prior);
}

function rankSkills(input: {
  avgAcc: number;
  avgFlu: number;
  avgConf: number;
  avgRate: number;
}): { topStrengths: string[]; needsPracticeAreas: string[]; mostImprovedSkill: string | null } {
  const skills = [
    { name: "Pronunciation", score: input.avgAcc },
    { name: "Fluency", score: input.avgFlu },
    { name: "Confidence", score: input.avgConf },
    { name: "Speaking Rate", score: input.avgRate },
  ].sort((a, b) => b.score - a.score);

  const topStrengths = skills.filter((s) => s.score >= 75).map((s) => s.name);
  const needsPracticeAreas = skills.filter((s) => s.score < 75).map((s) => s.name);

  const mostImprovedSkill = skills.length >= 2 && skills[0]!.score - skills[skills.length - 1]!.score >= 10
    ? skills[0]!.name
    : null;

  return { topStrengths, needsPracticeAreas, mostImprovedSkill };
}

export function buildParentDashboard(input: {
  todayPracticeSeconds: number;
  monthPracticeSeconds: number;
  wordsPracticed: number;
  recentOverallScores: number[];
  recentAccuracyScores: number[];
  recentFluencyScores: number[];
  recentConfidenceScores: number[];
  recentSpeakingRateScores?: number[];
  priorWeekOverallScores: number[];
  priorMonthOverallScores: number[];
  dailyStreak: number;
  weeklyStreak: number;
  badges: string[];
}): SpeechCoachV2ParentDashboard {
  const fluencyTrend = computeTrend(input.recentFluencyScores);
  const pronunciationTrend = computeTrend(input.recentAccuracyScores);
  const confidenceTrend = computeTrend(input.recentConfidenceScores);
  const speechConfidence = averageScore(input.recentConfidenceScores);

  const avgAcc = averageScore(input.recentAccuracyScores);
  const avgFlu = averageScore(input.recentFluencyScores);
  const avgConf = averageScore(input.recentConfidenceScores);
  const avgRate = averageScore(input.recentSpeakingRateScores ?? input.recentFluencyScores);

  const { topStrengths, needsPracticeAreas, mostImprovedSkill } = rankSkills({
    avgAcc,
    avgFlu,
    avgConf,
    avgRate,
  });

  const strengthAreas = topStrengths.length > 0 ? topStrengths : ["Building foundations"];
  const needsPractice = needsPracticeAreas.length > 0 ? needsPracticeAreas : [];

  return {
    todayPracticeSeconds: input.todayPracticeSeconds,
    monthPracticeSeconds: input.monthPracticeSeconds,
    wordsPracticed: input.wordsPracticed,
    speechConfidence,
    fluencyTrend,
    pronunciationTrend,
    confidenceTrend,
    weeklyImprovement: weeklyImprovement(
      input.recentOverallScores,
      input.priorWeekOverallScores,
    ),
    monthlyImprovement: weeklyImprovement(
      input.recentOverallScores,
      input.priorMonthOverallScores,
    ),
    strengthAreas,
    needsPracticeAreas: needsPractice,
    topStrengths,
    mostImprovedSkill,
    dailyStreak: input.dailyStreak,
    weeklyStreak: input.weeklyStreak,
    badges: input.badges as SpeechCoachV2ParentDashboard["badges"],
  };
}
