import type { AgeBand, DifficultyLevel, ModuleId } from "../types.js";
import type { LearningProfile } from "../types-v2.js";
import type {
  ColdStartPath,
  CommunityPatterns,
  GlobalGraph,
} from "./types-global.js";
import { moduleSequenceFromSkills } from "./communityPatterns.js";
import { calibratedDifficultyForChild } from "./difficultyCalibration.js";

export function isColdStartProfile(profile: LearningProfile): boolean {
  return profile.version <= 1 && profile.behavior.dropOffPoints.length === 0;
}

export function assignColdStartPath(
  graph: GlobalGraph,
  patterns: CommunityPatterns,
  ageBand: AgeBand,
): ColdStartPath {
  const sequence =
    patterns.highRetentionFlows[0] ??
    patterns.bestSequences[0] ??
    ["phonics", "motor_skills"];
  const modules = moduleSequenceFromSkills(sequence);
  const primarySkill = sequence[0] ?? "phonics";
  const globalScore = graph.difficultyLevels[primarySkill] ?? 0.45;
  const difficulty = calibratedDifficultyForChild("medium", globalScore, 0.35);

  if (ageBand === "24_36") {
    return {
      modules: ["phonics", "motor_skills"] as ModuleId[],
      skills: ["phonics", "motor_skills"],
      difficulty: "easy",
    };
  }

  return {
    modules,
    skills: sequence as ColdStartPath["skills"],
    difficulty,
  };
}

export function coldStartModulePriority(
  path: ColdStartPath,
): Partial<Record<ModuleId, number>> {
  const boost: Partial<Record<ModuleId, number>> = {};
  path.modules.forEach((m, i) => {
    boost[m] = 0.2 - i * 0.04;
  });
  return boost;
}
