import type { SessionGoal, SessionGoalProgress, TutorState } from "./types.js";
import type { TopicContext } from "./types.js";

export function createSessionGoal(ctx: TopicContext): SessionGoal {
  return {
    skillTarget: ctx.topic,
    completionTarget: 3,
    engagementTarget: 0.65,
  };
}

export function createInitialGoalProgress(): SessionGoalProgress {
  return {
    skillProgress: 0,
    completions: 0,
    engagementScore: 0.5,
  };
}

export function updateGoalProgress(
  progress: SessionGoalProgress,
  evaluation: { correct: boolean; engagementHint?: number },
): SessionGoalProgress {
  let completions = progress.completions;
  let skillProgress = progress.skillProgress;
  if (evaluation.correct) {
    completions += 1;
    skillProgress = Math.min(1, skillProgress + 0.2);
  } else {
    skillProgress = Math.max(0, skillProgress - 0.05);
  }
  const engagementScore =
    evaluation.engagementHint !== undefined
      ? Math.max(0, Math.min(1, evaluation.engagementHint))
      : progress.engagementScore;
  return { completions, skillProgress, engagementScore };
}

export function isSessionGoalMet(state: TutorState): boolean {
  const g = state.sessionGoal;
  const p = state.goalProgress;
  return (
    p.completions >= g.completionTarget &&
    p.skillProgress >= 0.6 &&
    p.engagementScore >= g.engagementTarget * 0.85
  );
}
