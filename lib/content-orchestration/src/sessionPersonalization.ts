import type { PersonalityProfile } from "./ml/types-personality.js";

export type SessionPersonalizationLimits = {
  maxItems: number;
  minItems: number;
  forceExplorationSlot: boolean;
  extraRewardSlots: number;
  coreSlotBias: number;
};

const DEFAULT_LIMITS: SessionPersonalizationLimits = {
  maxItems: 12,
  minItems: 4,
  forceExplorationSlot: false,
  extraRewardSlots: 0,
  coreSlotBias: 0,
};

/**
 * Personality-aware session sizing (guides buildSessionPlan, does not override rules).
 */
export function resolveSessionPersonalization(
  personality?: PersonalityProfile,
): SessionPersonalizationLimits {
  if (!personality) return { ...DEFAULT_LIMITS };

  const t = personality.traits;
  let maxItems = DEFAULT_LIMITS.maxItems;
  let minItems = DEFAULT_LIMITS.minItems;
  let forceExplorationSlot = false;
  let extraRewardSlots = 0;
  let coreSlotBias = 0;

  if (t.distractibility > 0.65) {
    maxItems = 8;
    minItems = 4;
  }
  if (t.persistence > 0.65) {
    maxItems = 14;
    coreSlotBias = 0.15;
  }
  if (t.curiosity > 0.6) {
    forceExplorationSlot = true;
  }
  if (t.rewardSensitivity > 0.65) {
    extraRewardSlots = 1;
  }

  return {
    maxItems,
    minItems,
    forceExplorationSlot,
    extraRewardSlots,
    coreSlotBias,
  };
}
