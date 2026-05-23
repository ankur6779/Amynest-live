import type { ModuleId } from "./types.js";
import type {
  LearningProfile,
  RankedContentItem,
  SessionContentType,
  SessionPlanItem,
  SessionSlotKind,
} from "./types-v2.js";
import { seededShuffle } from "./utils/seededShuffle.js";
import type { PersonalityProfile } from "./ml/types-personality.js";
import {
  resolveSessionPersonalization,
  type SessionPersonalizationLimits,
} from "./sessionPersonalization.js";

export const SESSION_RULES = {
  maxSameModule: 2,
  noBackToBackSameType: true,
  mix: ["learning", "interactive", "fun"] as SessionContentType[],
  emotionalCurve: ["easy", "medium", "reward"] as const,
};

const MODULE_CONTENT_TYPE: Partial<Record<ModuleId, SessionContentType>> = {
  phonics: "learning",
  language: "learning",
  cognitive: "learning",
  puzzles: "learning",
  motor_skills: "interactive",
  social_emotional: "interactive",
  creativity: "fun",
  stories: "fun",
};

function contentTypeFor(moduleId: ModuleId): SessionContentType {
  return MODULE_CONTENT_TYPE[moduleId] ?? "learning";
}

function slotForIndex(
  index: number,
  total: number,
  explorationTriggered: boolean,
): SessionSlotKind {
  if (index === 0) return "warmup";
  if (index === total - 1) return "reward";
  if (explorationTriggered && index === Math.floor(total / 2)) return "exploration";
  return "core";
}

export type BuildSessionInput = {
  rankedByModule: Map<ModuleId, RankedContentItem[]>;
  profile: LearningProfile;
  explorationTriggered: boolean;
  seed: number;
  maxItems?: number;
  personality?: PersonalityProfile;
  sessionLimits?: SessionPersonalizationLimits;
};

/**
 * Builds an emotionally curved session: easy win → core → exploration → reward.
 */
export function buildSessionPlan(input: BuildSessionInput): SessionPlanItem[] {
  const limits =
    input.sessionLimits ?? resolveSessionPersonalization(input.personality);
  const maxItems = input.maxItems ?? limits.maxItems;
  const explorationTriggered =
    input.explorationTriggered || limits.forceExplorationSlot;
  const flat: RankedContentItem[] = [];

  for (const [, items] of input.rankedByModule) {
    flat.push(...items.slice(0, 4));
  }

  const byScore = [...flat].sort((a, b) => b.contentScore - a.contentScore);
  const shuffled = seededShuffle(byScore, input.seed);

  const plan: SessionPlanItem[] = [];
  const moduleCounts = new Map<ModuleId, number>();
  let lastType: SessionContentType | null = null;

  for (let i = 0; i < shuffled.length && plan.length < maxItems; i++) {
    const item = shuffled[i]!;
    const modCount = moduleCounts.get(item.moduleId) ?? 0;
    if (modCount >= SESSION_RULES.maxSameModule) continue;

    const ctype = contentTypeFor(item.moduleId);
    if (
      SESSION_RULES.noBackToBackSameType &&
      lastType === ctype &&
      plan.length > 0
    ) {
      continue;
    }

    let slot = slotForIndex(plan.length, maxItems, explorationTriggered);
    if (
      limits.coreSlotBias > 0 &&
      slot === "reward" &&
      plan.filter((p) => p.slot === "core").length < 3
    ) {
      slot = "core";
    }

    plan.push({
      slot,
      moduleId: item.moduleId,
      contentId: item.contentId,
      contentType: ctype,
      difficulty: item.difficultyLevel,
      variationFlags: item.variationFlags,
      explorationItem:
        slot === "exploration" || (explorationTriggered && item.isNew),
    });

    moduleCounts.set(item.moduleId, modCount + 1);
    lastType = ctype;
  }

  for (let r = 0; r < limits.extraRewardSlots && plan.length < maxItems; r++) {
    const candidate = shuffled.find(
      (item) =>
        !plan.some((p) => p.contentId === item.contentId) &&
        contentTypeFor(item.moduleId) === "fun",
    );
    if (!candidate) break;
    plan.splice(Math.max(0, plan.length - 1), 0, {
      slot: "reward",
      moduleId: candidate.moduleId,
      contentId: candidate.contentId,
      contentType: "fun",
      difficulty: candidate.difficultyLevel,
      variationFlags: candidate.variationFlags,
    });
  }

  if (plan.length < limits.minItems) {
    for (const item of shuffled) {
      if (plan.length >= limits.minItems) break;
      if (plan.some((p) => p.contentId === item.contentId)) continue;
      const modCount = moduleCounts.get(item.moduleId) ?? 0;
      if (modCount >= SESSION_RULES.maxSameModule) continue;
      plan.push({
        slot: "core",
        moduleId: item.moduleId,
        contentId: item.contentId,
        contentType: contentTypeFor(item.moduleId),
        difficulty: item.difficultyLevel,
        variationFlags: item.variationFlags,
      });
      moduleCounts.set(item.moduleId, modCount + 1);
    }
  }

  return plan;
}

export function sessionFingerprint(plan: SessionPlanItem[]): string {
  return plan.map((p) => `${p.moduleId}:${p.contentId}:${p.slot}`).join("|");
}
