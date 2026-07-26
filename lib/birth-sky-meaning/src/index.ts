export {
  MEANING_ENGINE_VERSION,
  MEANING_CATEGORIES,
  type MeaningCategory,
  type MeaningTag,
  type MeaningSnapshot,
  type MeaningAstronomyInput,
  type ParentingGuidance,
  type MeaningConflict,
  type RuleHit,
} from "./types.js";

export { MeaningEngine, getMeaningEngine, computeMeaningSnapshot, withMeaningSnapshot } from "./engine.js";
export { evaluateRules, CONFLICT_PAIRS } from "./rules.js";
export { mergeRuleHits } from "./merge.js";
export { buildParentingGuidance } from "./parenting.js";
export { SIGN_BLOCKS, PARENTING_MAP } from "./catalog.js";
