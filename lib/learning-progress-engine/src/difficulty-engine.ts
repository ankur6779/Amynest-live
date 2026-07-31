import type { LearningProgressProfile, UnlockResult } from "./types";
import type { LearningMemory } from "./learning-memory";

export interface DifficultyAdjustment {
  overall: "easy" | "medium" | "hard";
  phonics: "easy" | "medium" | "hard";
  math: "easy" | "medium" | "hard";
  speech: "easy" | "medium" | "hard";
  puzzle: "easy" | "medium" | "hard";
  worksheet: "easy" | "medium" | "hard";
  story: "easy" | "medium" | "hard";
  engagementMode: "gentle" | "balanced" | "challenge";
  reason: string;
}

/**
 * @deprecated Product adaptivity is owned by Learning Runtime.
 * Kept for offline analytics / tests — do not wire into hub or world UI.
 */
export function difficultyAdjustmentEngine(input: {
  profile: LearningProgressProfile;
  unlocks: UnlockResult;
  memory: LearningMemory;
  recentAccuracy?: number;
  streakDays: number;
}): DifficultyAdjustment {
  const { profile, unlocks, memory, recentAccuracy = 70, streakDays } = input;

  const lowEngagement =
    profile.completedActivities.length < 3 && streakDays < 2;
  const highEngagement =
    streakDays >= 5 && profile.masteryScore >= 50 && recentAccuracy >= 75;
  const struggling = memory.strugglingSkills.length >= 2;

  let overall: "easy" | "medium" | "hard" = unlocks.puzzleDifficulty;
  let engagementMode: "gentle" | "balanced" | "challenge" = "balanced";
  let reason = "Balanced for steady growth";

  if (struggling || lowEngagement) {
    overall = "easy";
    engagementMode = "gentle";
    reason = "Extra gentle practice on tricky skills";
  } else if (highEngagement && !unlocks.isRevisionDay) {
    overall = "hard";
    engagementMode = "challenge";
    reason = "You're ready for bigger challenges!";
  } else if (unlocks.isRevisionDay) {
    overall = "easy";
    engagementMode = "gentle";
    reason = "Review day — let's strengthen foundations";
  }

  const sectionScale = (section: keyof LearningProgressProfile["sectionProgress"]) => {
    const s = profile.sectionProgress[section];
    if (!s || s.activitiesCompleted === 0) return overall;
    if (s.masteryPct < 45) return "easy";
    if (s.masteryPct > 80) return "hard";
    return overall;
  };

  return {
    overall,
    phonics: sectionScale("phonics"),
    math: sectionScale("math"),
    speech: sectionScale("speech"),
    puzzle: overall,
    worksheet: unlocks.worksheetDifficulty,
    story: sectionScale("stories"),
    engagementMode,
    reason,
  };
}
