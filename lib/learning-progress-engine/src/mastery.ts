import type {
  LearningPhase,
  CurriculumStage,
  SectionKey,
  SectionProgress,
  LearningProgressProfile,
} from "./types";
import { DEFAULT_SECTION_KEYS } from "./types";

/** Compute global mastery 0–100 from section progress + activity volume. */
export function computeMasteryScore(
  sectionProgress: Record<SectionKey, SectionProgress>,
  completedActivities: string[],
  streakDays: number,
): number {
  const hasActivity =
    completedActivities.length > 0 ||
    DEFAULT_SECTION_KEYS.some(
      (k) => (sectionProgress[k]?.activitiesCompleted ?? 0) > 0,
    );
  if (!hasActivity && streakDays === 0) return 0;

  const sections = DEFAULT_SECTION_KEYS;
  let sum = 0;
  let count = 0;
  for (const k of sections) {
    const s = sectionProgress[k];
    if (!s) continue;
    sum += s.masteryPct * 0.6 + s.level * 5;
    count += 1;
  }
  const sectionAvg = count > 0 ? sum / count : 0;
  const activityBonus = Math.min(15, completedActivities.length * 0.5);
  const streakBonus = Math.min(10, streakDays * 0.5);
  return Math.min(100, Math.round(sectionAvg + activityBonus + streakBonus));
}

export function computeLearningLevel(masteryScore: number, totalXP: number): number {
  const fromMastery = Math.floor(masteryScore / 12) + 1;
  const fromXp = Math.floor(totalXP / 500) + 1;
  return Math.min(50, Math.max(1, Math.max(fromMastery, fromXp)));
}

export function phaseForMastery(masteryScore: number): LearningPhase {
  if (masteryScore < 15) return "explore";
  if (masteryScore < 35) return "foundation";
  if (masteryScore < 55) return "practice";
  if (masteryScore < 75) return "mastery";
  if (masteryScore < 90) return "advanced";
  return "expert";
}

export function curriculumStageForLevel(learningLevel: number, age: number): CurriculumStage {
  const ageBand = age < 4 ? 0 : age < 6 ? 1 : age < 8 ? 2 : 3;
  const adjusted = learningLevel + ageBand * 2;
  if (adjusted < 6) return "early";
  if (adjusted < 12) return "beginner";
  if (adjusted < 20) return "intermediate";
  if (adjusted < 30) return "advanced";
  return "fluent";
}

/** True when weak sections dominate — schedule revision content. */
export function isRevisionDay(
  sectionProgress: Record<SectionKey, SectionProgress>,
  masteryScore: number,
): boolean {
  const weak = DEFAULT_SECTION_KEYS.filter(
    (k) => (sectionProgress[k]?.masteryPct ?? 0) < 45 && (sectionProgress[k]?.activitiesCompleted ?? 0) >= 2,
  );
  return weak.length >= 2 && masteryScore < 70;
}

export function deriveWeakSkills(
  sectionProgress: Record<SectionKey, SectionProgress>,
): SectionKey[] {
  return DEFAULT_SECTION_KEYS
    .filter((k) => {
      const s = sectionProgress[k];
      return s && s.masteryPct < 55 && s.activitiesCompleted >= 1;
    })
    .map((k) => k);
}

export function deriveUnlockedSkills(
  profile: Pick<LearningProgressProfile, "masteryScore" | "learningLevel" | "sectionProgress">,
): string[] {
  const skills: string[] = [];
  if (profile.masteryScore >= 10) skills.push("numbers_extended");
  if (profile.masteryScore >= 25) skills.push("alphabets_phonics");
  if (profile.masteryScore >= 40) skills.push("story_comprehension");
  if (profile.masteryScore >= 55) skills.push("speech_sentences");
  if (profile.learningLevel >= 5) skills.push("math_tricks");
  if (profile.learningLevel >= 8) skills.push("worksheet_advanced");
  if (profile.sectionProgress.phonics?.level >= 3) skills.push("phonics_blends");
  if (profile.sectionProgress.math?.level >= 4) skills.push("mental_math");
  return skills;
}

export function xpForActivity(activityId: string, correct: boolean): number {
  const base = 10;
  const bonus = correct ? 15 : 5;
  if (activityId.includes("story")) return base + bonus + 5;
  if (activityId.includes("speech")) return base + bonus + 8;
  return base + bonus;
}

export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2;
  if (streakDays >= 14) return 1.75;
  if (streakDays >= 7) return 1.5;
  if (streakDays >= 3) return 1.25;
  return 1;
}
