export {
  EVIDENCE_ENGINE_VERSION,
  type EvidenceSnapshot,
  type ExplainabilityEngineInput,
  type EvidenceNode,
  type EvidenceGraph,
  type ExplanationLevel,
  type ConfidenceBreakdown,
  type EvidenceRuleRef,
} from "./types.js";

export {
  ExplainabilityEngine,
  getExplainabilityEngine,
  computeEvidenceSnapshot,
  shouldIncludeEvidenceInAiContext,
} from "./engine.js";

export { stableRuleCode, ruleRef } from "./rule-ids.js";
export { projectLevel } from "./views.js";
export { buildDependencyGraph } from "./graph.js";
