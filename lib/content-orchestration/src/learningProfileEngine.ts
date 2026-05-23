import type { ModuleId } from "./types.js";
import type {
  LearningProfile,
  LearningProfileAdaptability,
  LearningProfileBehavior,
  LearningProfileSkills,
  SkillKey,
  SkillState,
} from "./types-v2.js";

const SKILL_MODULES: Record<SkillKey, ModuleId[]> = {
  phonics: ["phonics", "language"],
  motor_skills: ["motor_skills"],
  cognitive: ["cognitive", "puzzles"],
  social: ["social_emotional", "creativity"],
};

export function moduleToSkill(moduleId: ModuleId): SkillKey {
  for (const [skill, modules] of Object.entries(SKILL_MODULES) as [SkillKey, ModuleId[]][]) {
    if (modules.includes(moduleId)) return skill;
  }
  return "cognitive";
}

function defaultSkillState(level = 1): SkillState {
  const now = new Date().toISOString();
  return { level, confidence: 0.35, lastUpdated: now };
}

export function createDefaultLearningProfile(childId: string, userId?: string): LearningProfile {
  const now = new Date().toISOString();
  const skills: LearningProfileSkills = {
    phonics: defaultSkillState(1),
    motor_skills: defaultSkillState(1),
    cognitive: defaultSkillState(1),
    social: defaultSkillState(1),
  };
  return {
    childId,
    userId,
    version: 1,
    skills,
    behavior: {
      avgSessionTime: 0,
      preferredModules: [],
      dropOffPoints: [],
      engagementScore: 50,
    },
    adaptability: {
      difficultyTolerance: 0.5,
      noveltyPreference: 0.5,
      repetitionTolerance: 0.5,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function ensureLearningProfile(
  existing: LearningProfile | null | undefined,
  childId: string,
  userId?: string,
): LearningProfile {
  if (existing?.childId === childId) return existing;
  return createDefaultLearningProfile(childId, userId);
}

export function getSkillProfileVersion(profile: LearningProfile): number {
  return profile.version;
}

export function bumpProfileVersion(profile: LearningProfile): LearningProfile {
  return {
    ...profile,
    version: profile.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function updateSkillFromOutcome(
  profile: LearningProfile,
  skill: SkillKey,
  opts: {
    success: boolean;
    skipped: boolean;
    engagementDelta?: number;
  },
  rampSpeed: "slow" | "fast" = "slow",
): LearningProfile {
  const current = profile.skills[skill];
  const step = rampSpeed === "fast" ? 0.35 : 0.2;
  let level = current.level;
  let confidence = current.confidence;

  if (opts.success && !opts.skipped) {
    confidence = Math.min(1, confidence + step);
    if (confidence >= 0.85 && level < 5) {
      level += 1;
      confidence = 0.45;
    }
  } else if (opts.skipped) {
    confidence = Math.max(0.1, confidence - step * 1.2);
    if (confidence < 0.25 && level > 1) {
      level -= 1;
      confidence = 0.5;
    }
  } else {
    confidence = Math.max(0.15, confidence - step * 0.5);
  }

  const skills = {
    ...profile.skills,
    [skill]: {
      level: Math.max(1, Math.min(5, level)),
      confidence,
      lastUpdated: new Date().toISOString(),
    },
  };

  return bumpProfileVersion({ ...profile, skills });
}

export function updateBehaviorFromSession(
  behavior: LearningProfileBehavior,
  moduleId: ModuleId,
  timeSpentSec: number,
  engagementScore: number,
  dropOff?: string,
): LearningProfileBehavior {
  const sessions = behavior.avgSessionTime > 0 ? 2 : 1;
  const avgSessionTime =
    (behavior.avgSessionTime * (sessions - 1) + timeSpentSec) / sessions;

  const preferred = [...behavior.preferredModules];
  if (!preferred.includes(moduleId)) preferred.push(moduleId);
  preferred.sort((a, b) => a.localeCompare(b));

  const dropOffPoints = dropOff
    ? [...new Set([...behavior.dropOffPoints, dropOff].slice(-20))]
    : behavior.dropOffPoints;

  const engagement =
    behavior.engagementScore * 0.7 + engagementScore * 0.3;

  return {
    avgSessionTime,
    preferredModules: preferred.slice(-6),
    dropOffPoints,
    engagementScore: Math.round(engagement * 10) / 10,
  };
}

export function profileFromDbRow(row: {
  childId: string;
  userId: string;
  version: number;
  profile: LearningProfile;
  createdAt: Date;
  updatedAt: Date;
}): LearningProfile {
  const p = row.profile;
  return {
    ...p,
    childId: row.childId,
    userId: row.userId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function profileToDbPayload(profile: LearningProfile): {
  version: number;
  profile: LearningProfile;
} {
  return { version: profile.version, profile };
}

export { SKILL_MODULES };
