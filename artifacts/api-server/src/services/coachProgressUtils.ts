export type CoachFeedback = "yes" | "somewhat" | "no";

export function coachFeedbackPoints(f: CoachFeedback): number {
  return f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0;
}

export function computeCoachProgressPct(
  feedbackByWin: Record<number, CoachFeedback>,
  denom: number,
): number {
  if (denom <= 0) return 0;
  const sum = Object.values(feedbackByWin).reduce(
    (acc, fb) => acc + coachFeedbackPoints(fb),
    0,
  );
  return Math.min(100, Math.round((sum / denom) * 100));
}

export function coachingLayerForWin(winNumber: number): string {
  const layers = [
    "observation",
    "emotional",
    "communication",
    "environment",
    "routine",
    "reinforcement",
    "parent_regulation",
    "problem_solving",
    "skill_building",
    "reflection",
  ];
  return layers[(winNumber - 1) % layers.length]!;
}
