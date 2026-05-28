import type { LearningProgressProfile, SectionKey } from "./types";
import type { SkillGraphEntry } from "./skill-graph";
import { summarizeSkillGraph } from "./skill-graph";

export interface LearningMemory {
  masteredSkills: string[];
  forgottenSkills: string[];
  strugglingSkills: string[];
  favoriteActivities: string[];
  bestLearningTime: "morning" | "afternoon" | "evening" | "any";
  strongestCategory: SectionKey | null;
  weakestCategory: SectionKey | null;
  attentionPatterns: { shortBursts: boolean; consistentDaily: boolean };
  favoriteModules: string[];
  lastSessionCompletedAt: string | null;
  sessionStreakDays: number;
  consistencyScore: number;
}

export function buildLearningMemory(
  profile: LearningProgressProfile,
  skillEntries: SkillGraphEntry[],
  opts?: { hourOfDay?: number; sessionCompletedToday?: boolean },
): LearningMemory {
  const summary = summarizeSkillGraph(skillEntries);
  const sectionEntries = Object.entries(profile.sectionProgress) as [
    SectionKey,
    { masteryPct: number; activitiesCompleted: number },
  ][];

  let strongest: SectionKey | null = null;
  let weakest: SectionKey | null = null;
  let bestPct = -1;
  let worstPct = 101;
  for (const [k, s] of sectionEntries) {
    if (s.activitiesCompleted === 0) continue;
    if (s.masteryPct > bestPct) {
      bestPct = s.masteryPct;
      strongest = k;
    }
    if (s.masteryPct < worstPct) {
      worstPct = s.masteryPct;
      weakest = k;
    }
  }

  const activityCounts = new Map<string, number>();
  for (const id of profile.completedActivities) {
    const prefix = id.split("_")[0] ?? id;
    activityCounts.set(prefix, (activityCounts.get(prefix) ?? 0) + 1);
  }
  const favoriteActivities = [...activityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const hour = opts?.hourOfDay ?? new Date().getHours();
  const bestLearningTime =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const consistencyScore = Math.min(
    100,
    profile.streakDays * 12 + Math.min(40, profile.completedActivities.length),
  );

  return {
    masteredSkills: summary.masteredSkills,
    forgottenSkills: summary.forgottenSkills,
    strugglingSkills: summary.strugglingSkills,
    favoriteActivities,
    bestLearningTime,
    strongestCategory: strongest,
    weakestCategory: weakest,
    attentionPatterns: {
      shortBursts: profile.completedActivities.length > 20,
      consistentDaily: profile.streakDays >= 3,
    },
    favoriteModules: favoriteActivities,
    lastSessionCompletedAt: opts?.sessionCompletedToday
      ? new Date().toISOString().slice(0, 10)
      : null,
    sessionStreakDays: profile.streakDays,
    consistencyScore,
  };
}
