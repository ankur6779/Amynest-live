import type { LearningProfile, SkillKey } from "../types-v2.js";
import type { AttentionState } from "./types.js";

/**
 * explorationRate = base + boredom*0.3 + fatigue*0.2 - confidence*0.2
 */
export function computeDynamicExplorationRate(
  baseRate: number,
  attention: AttentionState,
  profile: LearningProfile,
  skillKey?: SkillKey,
): number {
  const skill = skillKey ? profile.skills[skillKey] : profile.skills.phonics;
  const confidence = skill?.confidence ?? 0.5;

  const rate =
    baseRate +
    attention.boredomLevel * 0.3 +
    attention.fatigueLevel * 0.2 -
    confidence * 0.2 +
    profile.adaptability.noveltyPreference * 0.15;

  return Math.max(0.05, Math.min(0.45, Math.round(rate * 1000) / 1000));
}
