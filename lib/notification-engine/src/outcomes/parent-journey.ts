import type { OutcomeSignals, ParentMilestone } from "./types.js";

export function detectParentMilestones(s: OutcomeSignals): ParentMilestone[] {
  const milestones: ParentMilestone[] = [];

  if (s.accountAgeDays <= 7) milestones.push("FIRST_WEEK");
  if (s.firstRoutineCompleted) milestones.push("FIRST_ROUTINE_COMPLETED");
  if (s.firstLearningCompleted) milestones.push("FIRST_LEARNING_COMPLETED");
  if (s.currentStreakDays >= 7 || s.hadSevenDayStreak) milestones.push("FIRST_7_DAY_STREAK");
  if (s.accountAgeDays >= 28 && s.firstMonthComplete) milestones.push("FIRST_MONTH");
  if (s.childLifecycleStage === "AT_RISK" || s.childLifecycleStage === "CHURNING") {
    milestones.push("AT_RISK");
  }
  if (s.childLifecycleStage === "RETURNED") milestones.push("RETURNING");

  return milestones;
}

export function primaryParentMilestone(milestones: ParentMilestone[]): ParentMilestone | null {
  const priority: ParentMilestone[] = [
    "RETURNING",
    "AT_RISK",
    "FIRST_7_DAY_STREAK",
    "FIRST_ROUTINE_COMPLETED",
    "FIRST_LEARNING_COMPLETED",
    "FIRST_MONTH",
    "FIRST_WEEK",
  ];
  for (const p of priority) {
    if (milestones.includes(p)) return p;
  }
  return milestones[0] ?? null;
}

export function milestoneJourneyCopy(
  milestone: ParentMilestone,
  childName: string,
): { title: string; body: string; deepLink: string } | null {
  switch (milestone) {
    case "FIRST_WEEK":
      return {
        title: "Your first week with AmyNest 🌱",
        body: `You're building a rhythm for ${childName}. Complete one small win today.`,
        deepLink: "/hub",
      };
    case "FIRST_ROUTINE_COMPLETED":
      return {
        title: "First routine done! 🎉",
        body: `${childName}'s first routine completion — consistency starts here.`,
        deepLink: "/routine",
      };
    case "FIRST_LEARNING_COMPLETED":
      return {
        title: "First lesson complete 📚",
        body: `${childName} finished their first lesson. One more builds the habit.`,
        deepLink: "/study-zone",
      };
    case "FIRST_7_DAY_STREAK":
      return {
        title: "7-day streak! 🔥",
        body: `A full week of showing up for ${childName}. Protect the streak today.`,
        deepLink: "/routine",
      };
    case "FIRST_MONTH":
      return {
        title: "One month together 🏆",
        body: `30 days of parenting with AmyNest. See how far ${childName} has come.`,
        deepLink: "/hub",
      };
    case "AT_RISK":
      return {
        title: "We miss you 💛",
        body: `A 2-minute routine check-in can restart momentum for ${childName}.`,
        deepLink: "/routine",
      };
    case "RETURNING":
      return {
        title: "Welcome back 👋",
        body: `Pick up where you left off — ${childName}'s plan is ready.`,
        deepLink: "/hub",
      };
    default:
      return null;
  }
}
