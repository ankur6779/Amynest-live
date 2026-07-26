/**
 * MeaningEngine — AstronomyData → MeaningSnapshot (deterministic, no LLM).
 */

import { mergeRuleHits } from "./merge.js";
import { buildParentingGuidance } from "./parenting.js";
import { evaluateRules } from "./rules.js";
import {
  MEANING_ENGINE_VERSION,
  type MeaningAstronomyInput,
  type MeaningSnapshot,
} from "./types.js";

export class MeaningEngine {
  readonly version = MEANING_ENGINE_VERSION;

  compute(astronomy: MeaningAstronomyInput): MeaningSnapshot {
    // Idempotent: if already attached with same engine version, return as-is
    if (
      astronomy.meaningSnapshot &&
      astronomy.meaningSnapshot.meaningEngineVersion === MEANING_ENGINE_VERSION
    ) {
      return astronomy.meaningSnapshot;
    }

    const hits = evaluateRules(astronomy);
    const { categories, conflicts } = mergeRuleHits(hits);
    const parentingGuidance = buildParentingGuidance(categories);

    const pick = (key: keyof typeof categories) =>
      categories[key].map((t) => t.label);

    return {
      meaningEngineVersion: MEANING_ENGINE_VERSION,
      // Wall-clock only for audit; semantic fields below are deterministic.
      generatedAt: new Date().toISOString(),
      astrologyMode: astronomy.astrologyMode ?? null,
      zodiacMode: astronomy.zodiacMode ?? null,
      categories,
      parentingGuidance,
      conflicts,
      profile: {
        learningStyle: pick("learningStyle"),
        communicationStyle: pick("communicationStyle"),
        creativeStrength: pick("creativeStyle"),
        attentionPattern: pick("attentionPattern"),
        emotionalProfile: pick("emotionalPattern"),
        socialProfile: pick("socialStyle"),
        strengths: pick("strengths"),
        comfortNeeds: pick("comfortNeeds"),
        motivationStyle: pick("motivationStyle"),
        curiosityPattern: pick("curiosityPattern"),
      },
    };
  }
}

let singleton: MeaningEngine | null = null;

export function getMeaningEngine(): MeaningEngine {
  if (!singleton) singleton = new MeaningEngine();
  return singleton;
}

export function computeMeaningSnapshot(
  astronomy: MeaningAstronomyInput,
): MeaningSnapshot {
  return getMeaningEngine().compute(astronomy);
}

/** Attach meaning onto astronomy object without mutating historical shape contract. */
export function withMeaningSnapshot<T extends MeaningAstronomyInput>(
  astronomy: T,
): T & { meaningSnapshot: MeaningSnapshot } {
  const meaningSnapshot = computeMeaningSnapshot(astronomy);
  return { ...astronomy, meaningSnapshot };
}
