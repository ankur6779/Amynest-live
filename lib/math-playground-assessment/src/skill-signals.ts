import type {
  PlaygroundEngagementState,
  PlaygroundLearningState,
  SkillBreakdown,
} from "@workspace/math-playground";
import { computeSkillBreakdown, SKILL_ACTIVITIES } from "@workspace/math-playground";
import type { PlaygroundActivityId } from "@workspace/math-playground";

export function sessionsForSkill(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
) {
  const ids = new Set(SKILL_ACTIVITIES[skill]);
  return learning.sessionHistory.filter((r) => ids.has(r.activityId));
}

export function avgResponseTimeMs(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): number | null {
  const sessions = sessionsForSkill(learning, skill);
  const times = sessions
    .map((s) => s.responseTimeMs)
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (times.length === 0) return null;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

export function hintRate(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): number {
  const sessions = sessionsForSkill(learning, skill);
  if (sessions.length === 0) return 0;
  const withHints = sessions.filter((s) => s.hintsUsed > 0).length;
  return withHints / sessions.length;
}

export function retryRate(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): number {
  const sessions = sessionsForSkill(learning, skill);
  if (sessions.length === 0) return 0;
  const withRetries = sessions.filter((s) => (s.retryCount ?? 0) > 0).length;
  return withRetries / sessions.length;
}

export function failureRate(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): number {
  const sessions = sessionsForSkill(learning, skill);
  if (sessions.length === 0) return 0;
  const fails = sessions.filter((s) => !s.success).length;
  return fails / sessions.length;
}

export function suggestedActivityForSkill(
  skill: keyof SkillBreakdown,
): PlaygroundActivityId {
  return SKILL_ACTIVITIES[skill][0] ?? "counting_adventure";
}

export function attentionSpanScore(
  learning: PlaygroundLearningState,
  engagement?: PlaygroundEngagementState,
): number {
  const recent = learning.sessionHistory.slice(0, 10);
  if (recent.length === 0) return 50;

  const avgDuration =
    recent.reduce((sum, s) => sum + s.durationMs, 0) / recent.length;
  const idlePenalty =
    recent.filter((s) => (s.idleMs ?? 0) > 15_000).length / recent.length;

  let score = 40;
  if (avgDuration >= 120_000) score += 35;
  else if (avgDuration >= 60_000) score += 25;
  else if (avgDuration >= 30_000) score += 15;

  score -= Math.round(idlePenalty * 25);

  if (engagement && engagement.consecutiveSuccesses >= 3) score += 10;
  if (engagement && engagement.consecutiveFailures >= 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function persistenceScore(
  learning: PlaygroundLearningState,
  engagement?: PlaygroundEngagementState,
): number {
  const sessions = learning.sessionHistory;
  if (sessions.length === 0) return 50;

  const completedDespiteHints =
    sessions.filter((s) => s.hintsUsed > 0 && s.success).length / sessions.length;
  const retryRecovery =
    sessions.filter((s) => (s.retryCount ?? 0) > 0 && s.success).length /
    Math.max(1, sessions.filter((s) => (s.retryCount ?? 0) > 0).length);

  let score = 45 + Math.round(completedDespiteHints * 30) + Math.round(retryRecovery * 20);
  if (engagement && engagement.consecutiveFailures >= 2 && engagement.consecutiveSuccesses >= 1) {
    score += 10;
  }
  return Math.max(0, Math.min(100, score));
}

export function problemSolvingScore(breakdown: SkillBreakdown): number {
  const puzzleScore = breakdown.patterns;
  const ops = [breakdown.addition, breakdown.subtraction].filter((v) => v > 0);
  const opsAvg = ops.length > 0 ? ops.reduce((a, b) => a + b, 0) / ops.length : 0;
  if (puzzleScore === 0 && opsAvg === 0) return 45;
  return Math.round(puzzleScore * 0.55 + opsAvg * 0.45);
}

export function numberRecognitionScore(breakdown: SkillBreakdown): number {
  return Math.round(breakdown.counting * 0.7 + breakdown.patterns * 0.3);
}
