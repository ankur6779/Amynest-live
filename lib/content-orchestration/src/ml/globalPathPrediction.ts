import type { SkillKey } from "../types-v2.js";
import type { PredictionOutput } from "./types-prediction.js";
import type { CommunityPatterns, GlobalGraph } from "./types-global.js";
import { applyGlobalBiasToPath } from "./globalBiasControl.js";

const SKILL_ORDER: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];

export function predictNextSkills(
  currentSkill: SkillKey,
  graph: GlobalGraph,
  limit = 3,
): SkillKey[] {
  const row = graph.transitions[currentSkill] ?? {};
  const ranked = SKILL_ORDER.filter((s) => s !== currentSkill)
    .map((s) => ({ skill: s, prob: row[s] ?? graph.successRates[s] ?? 0.4 }))
    .sort((a, b) => b.prob - a.prob);
  return applyGlobalBiasToPath(ranked.map((r) => r.skill)).slice(0, limit);
}

export function recommendGlobalLearningPath(
  graph: GlobalGraph,
  patterns: CommunityPatterns,
  currentSkill?: SkillKey,
): string[] {
  if (currentSkill) {
    return [currentSkill, ...predictNextSkills(currentSkill, graph, 2)];
  }
  const best = patterns.bestSequences[0];
  if (best?.length) return [...best];
  return ["phonics", "motor_skills", "cognitive"];
}

/**
 * Gentle enhancement — child prediction stays primary.
 */
export function applyGlobalPathToPrediction(
  prediction: PredictionOutput,
  graph: GlobalGraph,
  patterns: CommunityPatterns,
  weight = 0.12,
): PredictionOutput {
  const forecasts = [...prediction.skillForecasts];
  const path = recommendGlobalLearningPath(
    graph,
    patterns,
    forecasts.sort((a, b) => a.currentLevel - b.currentLevel)[0]?.skill,
  );

  for (const f of forecasts) {
    const idx = path.indexOf(f.skill);
    if (idx >= 0 && idx < path.length - 1) {
      const boost = (path.length - idx) * weight * 0.05;
      const next = prediction.nextSkillLevels[f.skill] ?? f.currentLevel;
      prediction.nextSkillLevels[f.skill] = Math.min(5, next + boost);
    }
  }

  return { ...prediction, skillForecasts: forecasts };
}
