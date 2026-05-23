import type { AgeBand, ModuleId } from "../types.js";
import type { LearningProfile } from "../types-v2.js";
import { moduleToSkill } from "../learningProfileEngine.js";
import type { SessionFeedbackInput } from "../types-v2.js";
import type {
  LearningPath,
  LearningPathMilestone,
  LearningPathSummary,
} from "./types-personality.js";
import type { FuturePathForecast } from "./types-prediction.js";
import type { PredictionOutput } from "./types-prediction.js";

const TRACK_PRIORITY: ModuleId[] = [
  "phonics",
  "motor_skills",
  "language",
  "cognitive",
  "social_emotional",
  "puzzles",
  "creativity",
  "stories",
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function parseGoalModule(goal: string): ModuleId | null {
  if (goal.startsWith("phonics")) return "phonics";
  if (goal.startsWith("motor_skills")) return "motor_skills";
  if (goal.startsWith("language")) return "language";
  if (goal.startsWith("cognitive")) return "cognitive";
  if (goal.startsWith("social")) return "social_emotional";
  if (goal.startsWith("puzzles")) return "puzzles";
  return null;
}

function parseGoalTargetLevel(goal: string): number | undefined {
  const m = goal.match(/level_(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

export function buildInitialGoals(
  profile: LearningProfile,
  ageBand: AgeBand,
): string[] {
  const goals: string[] = ["phonics_mastery"];
  const motorLevel = profile.skills.motor_skills.level;
  goals.push(`motor_skills_level_${Math.min(5, Math.max(2, motorLevel + 1))}`);
  if (ageBand === "36_48" || ageBand === "48_72") {
    goals.push("cognitive_level_3");
  }
  return goals;
}

export function createInitialLearningPath(
  childId: string,
  profile: LearningProfile,
  ageBand: AgeBand,
): LearningPath {
  const goals = buildInitialGoals(profile, ageBand);
  const currentTrack = pickCurrentTrack(profile, goals);
  const now = new Date().toISOString();
  return {
    childId,
    goals,
    currentTrack,
    milestones: goals.map((goal, i) => ({
      id: `m_${i}_${goal}`,
      goal,
      targetModule: parseGoalModule(goal) ?? undefined,
      targetLevel: parseGoalTargetLevel(goal),
      completed: false,
    })),
    progressScore: 0,
    version: 1,
    lastUpdated: now,
  };
}

export function ensureLearningPath(
  existing: LearningPath | null | undefined,
  childId: string,
  profile: LearningProfile,
  ageBand: AgeBand,
): LearningPath {
  if (existing && existing.childId === childId) return existing;
  return createInitialLearningPath(childId, profile, ageBand);
}

function pickCurrentTrack(profile: LearningProfile, goals: string[]): ModuleId {
  for (const goal of goals) {
    const mod = parseGoalModule(goal);
    if (!mod) continue;
    const skill = moduleToSkill(mod);
    const level = profile.skills[skill].level;
    const target = parseGoalTargetLevel(goal) ?? 3;
    if (level < target) return mod;
  }
  return TRACK_PRIORITY.find((m) => profile.skills[moduleToSkill(m)].level < 4) ?? "phonics";
}

export function computeGoalAlignmentScore(
  moduleId: ModuleId,
  path: LearningPath,
): number {
  let best = 0;
  for (const milestone of path.milestones) {
    if (milestone.completed) continue;
    const mod = milestone.targetModule ?? parseGoalModule(milestone.goal);
    if (mod === moduleId) {
      best = Math.max(best, 1);
    } else if (path.currentTrack === moduleId) {
      best = Math.max(best, 0.65);
    }
  }
  if (path.goals.some((g) => parseGoalModule(g) === moduleId)) {
    best = Math.max(best, 0.85);
  }
  return best;
}

export function computePathProgress(
  path: LearningPath,
  profile: LearningProfile,
): number {
  if (path.milestones.length === 0) return 0;
  let sum = 0;
  for (const m of path.milestones) {
    if (m.completed) {
      sum += 1;
      continue;
    }
    const mod = m.targetModule ?? parseGoalModule(m.goal);
    if (!mod) continue;
    const skill = moduleToSkill(mod);
    const level = profile.skills[skill].level;
    const target = m.targetLevel ?? 3;
    sum += clamp01(level / target);
  }
  return clamp01(sum / path.milestones.length);
}

export function updateMilestones(
  path: LearningPath,
  profile: LearningProfile,
): LearningPathMilestone[] {
  const now = new Date().toISOString();
  return path.milestones.map((m) => {
    if (m.completed) return m;
    const mod = m.targetModule ?? parseGoalModule(m.goal);
    if (!mod) return m;
    const skill = moduleToSkill(mod);
    const level = profile.skills[skill].level;
    const target = m.targetLevel ?? 3;
    if (level >= target) {
      return { ...m, completed: true, completedAt: now };
    }
    return m;
  });
}

export function reEvaluateLearningPath(
  path: LearningPath,
  profile: LearningProfile,
  ageBand: AgeBand,
): LearningPath {
  const milestones = updateMilestones(path, profile);
  const progressScore = computePathProgress({ ...path, milestones }, profile);
  const allDone = milestones.every((m) => m.completed);
  const goals = allDone ? buildInitialGoals(profile, ageBand) : path.goals;
  const currentTrack = pickCurrentTrack(profile, goals);

  return {
    ...path,
    goals,
    currentTrack,
    milestones: allDone
      ? goals.map((goal, i) => ({
          id: `m_${path.version}_${i}_${goal}`,
          goal,
          targetModule: parseGoalModule(goal) ?? undefined,
          targetLevel: parseGoalTargetLevel(goal),
          completed: false,
        }))
      : milestones,
    progressScore,
    version: path.version + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function updateLearningPathAfterSession(
  path: LearningPath,
  profile: LearningProfile,
  ageBand: AgeBand,
  feedback?: SessionFeedbackInput,
): LearningPath {
  let next = reEvaluateLearningPath(path, profile, ageBand);
  if (feedback?.completed && feedback.completionRate >= 0.75) {
    const mod = feedback.moduleId;
    next = {
      ...next,
      currentTrack: mod,
      progressScore: Math.min(1, next.progressScore + 0.05),
    };
  }
  return next;
}

export function learningPathSummary(path: LearningPath): LearningPathSummary {
  const active = path.milestones.find((m) => !m.completed);
  return {
    currentGoal: active?.goal ?? path.goals[0] ?? "phonics_mastery",
    progress: Math.round(path.progressScore * 1000) / 10,
  };
}

/**
 * Forecast upcoming milestones and risk areas (V6 predictive layer).
 */
export function forecastFuturePath(
  path: LearningPath,
  profile: LearningProfile,
  prediction?: PredictionOutput,
): FuturePathForecast {
  const nextMilestones = path.milestones.filter((m) => !m.completed).slice(0, 4);
  const riskAreas: string[] = [];

  if (prediction) {
    if (prediction.predictedDropOffRisk > 0.5) {
      riskAreas.push("drop_off_risk");
    }
    for (const f of prediction.skillForecasts) {
      if (f.status === "plateau") riskAreas.push(`${f.skill}_plateau`);
      if (f.status === "fast_growth") riskAreas.push(`${f.skill}_acceleration`);
    }
  }

  if (profile.behavior.engagementScore < 45) riskAreas.push("low_engagement");
  if (profile.behavior.dropOffPoints.length >= 3) riskAreas.push("frequent_drop_offs");

  const remaining = nextMilestones.length;
  const pace =
    prediction?.predictedEngagement && prediction.predictedEngagement > 0.6
      ? 0.85
      : 1.2;
  const estimatedCompletionDays = Math.max(
    3,
    Math.round(remaining * 4 * pace),
  );

  return {
    nextMilestones,
    estimatedCompletionDays,
    riskAreas: [...new Set(riskAreas)],
  };
}

/** Balance long-term goals vs short-term engagement (cap goal boost). */
export const DEFAULT_GOAL_ALIGNMENT_WEIGHT = 0.12;
