import type { NotificationGoal, OutcomeSignals } from "./types.js";

export interface CoachCopyInput {
  title: string;
  body: string;
  childName: string;
  goal: NotificationGoal;
  signals: OutcomeSignals;
}

/**
 * Transform generic notification copy into coach-style, outcome-oriented messaging.
 */
export function coachifyCopy(input: CoachCopyInput): { title: string; body: string } {
  const { title, body, childName, goal, signals: s } = input;

  if (body.toLowerCase().includes("open amynest")) {
    return rewriteGenericOpen(childName, goal, s);
  }

  let coachedTitle = title;
  let coachedBody = body;

  switch (goal) {
    case "GOAL_LEARNING_COMPLETION":
      if (s.unfinishedLessonCount > 0) {
        coachedBody = `${childName} is only one lesson away from completing this week's reading goal.`;
      } else if (s.weakSubjects.length > 0) {
        coachedBody = `A quick 10-minute ${s.weakSubjects[0]} session today closes the gap for ${childName}.`;
      }
      break;
    case "GOAL_ROUTINE_COMPLETION":
      if (s.routinesMissedYesterday) {
        coachedBody = `Yesterday was full — today, one routine win for ${childName} rebuilds the habit.`;
      } else if (s.currentStreakDays >= 1) {
        coachedBody = `Day ${s.currentStreakDays + 1} of showing up for ${childName}. Check off the next task.`;
      }
      break;
    case "GOAL_STREAK_RECOVERY":
      coachedTitle = coachedTitle.replace("reminder", "comeback");
      coachedBody = `Streaks break — coaches come back. One small win today for ${childName}.`;
      break;
    case "GOAL_SUBSCRIPTION":
      coachedBody = coachedBody.replace(
        /unlock|premium/i,
        (m) => `${m} — you've already seen ${childName} progress`,
      );
      break;
    case "GOAL_RETENTION":
    case "GOAL_REACTIVATION":
      coachedBody = `${childName}'s plan is ready. Two minutes today beats a perfect week never started.`;
      break;
    default:
      break;
  }

  if (!coachedTitle.includes(childName) && coachedTitle.length < 60) {
    coachedTitle = coachedTitle.replace(/^/, "").trim();
  }

  return { title: coachedTitle, body: coachedBody };
}

function rewriteGenericOpen(
  childName: string,
  goal: NotificationGoal,
  s: OutcomeSignals,
): { title: string; body: string } {
  switch (goal) {
    case "GOAL_LEARNING_COMPLETION":
      return {
        title: `${childName}'s learning goal is close 📚`,
        body: "One short lesson today keeps the momentum going.",
      };
    case "GOAL_ROUTINE_COMPLETION":
      return {
        title: `Today's plan for ${childName} ☀️`,
        body: "Check off the first routine task — the rest gets easier.",
      };
    case "GOAL_SUBSCRIPTION":
      return {
        title: "Ready for more?",
        body: `${childName}'s progress deserves the full AmyNest toolkit.`,
      };
    default:
      return {
        title: `Quick win for ${childName}`,
        body: "Two minutes now saves twenty minutes of stress later.",
      };
  }
}
