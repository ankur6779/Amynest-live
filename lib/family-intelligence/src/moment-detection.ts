import type { FamilyIntelligenceInput, FamilyMoment } from "./types.js";

export function detectFamilyMoments(input: FamilyIntelligenceInput): FamilyMoment[] {
  const moments: FamilyMoment[] = [];
  const now = new Date().toISOString();

  if (input.accountAgeDays >= 7 && input.accountAgeDays <= 9 && input.weeklyRoutineConsistency >= 0.6) {
    moments.push({
      type: "first_successful_week",
      title: "First successful week! 🎉",
      description: `${input.childName}'s family rhythm is taking shape.`,
      childId: input.primaryChildId,
      detectedAt: now,
      coordinatedActions: [
        { surface: "notifications", action: "celebration_push" },
        { surface: "rewards", action: "week_badge" },
        { surface: "parent_hub", action: "milestone_card" },
      ],
    });
  }

  if (input.accountAgeDays >= 28 && input.accountAgeDays <= 32) {
    moments.push({
      type: "first_month",
      title: "One month with AmyNest 🏆",
      description: "A full month of parenting with data-driven support.",
      childId: input.primaryChildId,
      detectedAt: now,
      coordinatedActions: [
        { surface: "parent_hub", action: "monthly_recap" },
        { surface: "amy_ai", action: "reflection_prompt" },
        { surface: "events", action: "month_celebration" },
      ],
    });
  }

  if (input.strongSubjects.length >= 1 && input.lessonsCompleted7d >= 5) {
    moments.push({
      type: "learning_breakthrough",
      title: "Learning breakthrough ⭐",
      description: `${input.childName} is excelling in ${input.strongSubjects[0]}.`,
      childId: input.primaryChildId,
      detectedAt: now,
      coordinatedActions: [
        { surface: "learning_zone", action: "bonus_challenge" },
        { surface: "rewards", action: "skill_badge" },
        { surface: "notifications", action: "achievement_push" },
      ],
    });
  }

  if (input.currentStreakDays === 7 || input.currentStreakDays === 14 || input.currentStreakDays === 30) {
    moments.push({
      type: "consistency_milestone",
      title: `${input.currentStreakDays}-day streak! 🔥`,
      description: `Consistency milestone for ${input.childName}.`,
      childId: input.primaryChildId,
      detectedAt: now,
      coordinatedActions: [
        { surface: "rewards", action: "streak_reward" },
        { surface: "notifications", action: "streak_celebration" },
        { surface: "parent_hub", action: "streak_card" },
      ],
    });
  }

  if (
    input.routineCompletionRate7d >= 0.75 &&
    input.lessonsCompleted7d >= 3 &&
    input.currentStreakDays >= 5
  ) {
    moments.push({
      type: "habit_formation",
      title: "Habits forming 🌱",
      description: "Routine + learning patterns are becoming automatic.",
      childId: input.primaryChildId,
      detectedAt: now,
      coordinatedActions: [
        { surface: "amy_ai", action: "habit_reinforcement" },
        { surface: "parent_hub", action: "habit_insight" },
      ],
    });
  }

  return moments;
}
