import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { GoalCoachState } from "./types.js";

export function buildGoalCoachState(snapshot: FamilyIntelligenceSnapshot): GoalCoachState {
  const goals = snapshot.goals.map((g) => {
    const pct = g.targetValue > 0 ? g.progress / g.targetValue : 0;
    const onTrack = pct >= 0.6 || (pct >= 0.4 && g.targetValue <= 3);
    return {
      ...g,
      onTrack,
      coachMessage: coachMessageForGoal(g.type, g.progress, g.targetValue, snapshot.childName, onTrack),
    };
  });

  const overallProgress =
    goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + (g.targetValue > 0 ? g.progress / g.targetValue : 0), 0) / goals.length * 100)
      : 0;

  return { goals, overallProgress };
}

function coachMessageForGoal(
  type: string,
  progress: number,
  target: number,
  childName: string,
  onTrack: boolean,
): string {
  const remaining = Math.max(0, target - progress);
  if (onTrack) {
    return `${childName}'s ${type} goal is on track — ${remaining} to go this period.`;
  }
  if (remaining === 1) {
    return `One more ${type} session closes the loop for ${childName} this week.`;
  }
  return `${type} goal needs a nudge — ${remaining} remaining. Small steps count.`;
}
