import type { LearningProfile } from "../types-v2.js";
import type { AttentionState, RealtimeDecision } from "./types.js";
import type { RealtimeExperimentFlags } from "./types.js";
import { isBoredomHigh, isFatigueHigh } from "./attentionEngine.js";
import { rewardCooldownMs } from "./config.js";
import type { PersonalityProfile } from "../ml/types-personality.js";

export type RewardPolicy = {
  cooldownMultiplier: number;
  delayRewards: boolean;
};

export type RewardEngineState = {
  lastRewardAt: number;
  milestonesCelebrated: Set<string>;
};

export function createRewardEngineState(): RewardEngineState {
  return { lastRewardAt: 0, milestonesCelebrated: new Set() };
}

export function resolveRewardPolicy(
  personality?: PersonalityProfile,
): RewardPolicy {
  if (!personality) {
    return { cooldownMultiplier: 1, delayRewards: false };
  }
  const t = personality.traits;
  let cooldownMultiplier = 1;
  if (t.rewardSensitivity > 0.65) cooldownMultiplier = 0.75;
  if (t.persistence > 0.65) cooldownMultiplier = Math.max(cooldownMultiplier, 1.25);
  return {
    cooldownMultiplier,
    delayRewards: t.persistence > 0.7 && t.rewardSensitivity < 0.45,
  };
}

export function shouldInjectReward(
  attention: AttentionState,
  experiments: RealtimeExperimentFlags,
  state: RewardEngineState,
  now = Date.now(),
  personality?: PersonalityProfile,
): boolean {
  const policy = resolveRewardPolicy(personality);
  const cooldown = rewardCooldownMs(experiments.rewardFrequency) * policy.cooldownMultiplier;
  if (now - state.lastRewardAt < cooldown) return false;
  if (policy.delayRewards && !isFatigueHigh(attention)) return false;
  return isFatigueHigh(attention) || isBoredomHigh(attention);
}

export function buildRewardDecision(reason: string): RealtimeDecision {
  return {
    action: "INJECT_REWARD",
    payload: { slot: "next", celebrate: true },
    reason,
  };
}

export function checkMilestoneReached(
  profile: LearningProfile,
  state: RewardEngineState,
): RealtimeDecision | null {
  for (const [skill, data] of Object.entries(profile.skills)) {
    const key = `${skill}_L${data.level}`;
    if (data.confidence >= 0.8 && !state.milestonesCelebrated.has(key)) {
      state.milestonesCelebrated.add(key);
      return {
        action: "INJECT_REWARD",
        payload: { celebrate: true, milestone: skill, level: data.level },
        reason: "milestone_reached",
      };
    }
  }
  return null;
}

export function markRewardInjected(state: RewardEngineState, now = Date.now()): void {
  state.lastRewardAt = now;
}
