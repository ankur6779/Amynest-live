import type { LearningProgressProfile, SectionKey } from "./types";
import type { WeeklyParentReport } from "./types";
import type { LearningMemory } from "./learning-memory";
import type { SkillGraphEntry } from "./skill-graph";
import { getSkillDef } from "./skill-graph";
import type { SkillTreeBranch } from "./skill-trees";

export interface StreakCalendarDay {
  date: string;
  active: boolean;
  label?: string;
}

export interface ParentGrowthDashboard {
  weeklyReport: WeeklyParentReport;
  consistencyScore: number;
  strongestSkills: { skillId: string; title: string; mastery: number }[];
  improvementAreas: { skillId: string; title: string; mastery: number }[];
  learningTrend: "up" | "steady" | "needs_support";
  streakCalendar: StreakCalendarDay[];
  attentionInsight: string;
  premiumInsight: string | null;
  skillTrees: { math: SkillTreeBranch; language: SkillTreeBranch };
}

export function buildStreakCalendar(
  lastActiveDate: string | null,
  streakDays: number,
  todayIso: string,
): StreakCalendarDay[] {
  const days: StreakCalendarDay[] = [];
  const today = new Date(todayIso);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const active =
      lastActiveDate === iso ||
      (i < streakDays && lastActiveDate != null);
    days.push({
      date: iso,
      active,
      label: active ? "✓" : undefined,
    });
  }
  return days;
}

export function buildParentGrowthDashboard(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  weeklyReport: WeeklyParentReport;
  skillEntries: SkillGraphEntry[];
  skillTrees: { math: SkillTreeBranch; language: SkillTreeBranch };
  isPremium: boolean;
  dateIso: string;
}): ParentGrowthDashboard {
  const { profile, memory, weeklyReport, skillEntries, skillTrees, isPremium, dateIso } =
    input;

  const sorted = [...skillEntries].sort((a, b) => b.mastery - a.mastery);
  const strongestSkills = sorted.slice(0, 4).map((e) => ({
    skillId: e.skillId,
    title: getSkillDef(e.skillId)?.title ?? e.skillId,
    mastery: e.mastery,
  }));
  const improvementAreas = [...skillEntries]
    .filter((e) => e.mastery < 55 && e.attempts >= 1)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4)
    .map((e) => ({
      skillId: e.skillId,
      title: getSkillDef(e.skillId)?.title ?? e.skillId,
      mastery: e.mastery,
    }));

  const learningTrend: "up" | "steady" | "needs_support" =
    profile.masteryScore >= 55 && profile.streakDays >= 3
      ? "up"
      : memory.strugglingSkills.length >= 2
        ? "needs_support"
        : "steady";

  const attentionInsight = memory.attentionPatterns.consistentDaily
    ? "Short daily sessions are working beautifully — that rhythm builds calm confidence."
    : "A cozy 5-minute ritual at the same time each day can feel magical for focus.";

  const premiumInsight = isPremium
    ? "Amy is gently shaping tomorrow's path around what your child loves and what helps them grow."
    : null;

  return {
    weeklyReport,
    consistencyScore: memory.consistencyScore,
    strongestSkills,
    improvementAreas,
    learningTrend,
    streakCalendar: buildStreakCalendar(profile.lastActiveDate, profile.streakDays, dateIso),
    attentionInsight,
    premiumInsight,
    skillTrees,
  };
}
