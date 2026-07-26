/**
 * Explainability / Evidence Engine types.
 * Reconstructs traces from existing snapshots — does not alter engine outputs.
 */

import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type { ConversationPlan } from "@workspace/birth-sky-conversation";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import type {
  MeaningAstronomyInput,
  MeaningSnapshot,
} from "@workspace/birth-sky-meaning";

export const EVIDENCE_ENGINE_VERSION = "evidence-engine/1.0.0" as const;

export type ExplanationLevel = "developer" | "debug" | "compact";

export type EngineOrigin =
  | "astronomy"
  | "meaning"
  | "development"
  | "adaptive"
  | "conversation";

export type EvidenceRuleRef = {
  /** Stable code e.g. M-104 */
  id: string;
  /** Original engine rule key e.g. sun_sign_Leo */
  key: string;
};

export type EvidenceNode = {
  /** Concept / topic id */
  id: string;
  label: string;
  engine: EngineOrigin;
  engineVersion: string;
  rules: EvidenceRuleRef[];
  supportingFacts: string[];
  confidence: number;
  dependencies: string[];
};

export type GraphEdge = {
  from: string;
  to: string;
  relation: "derives" | "boosts" | "prioritizes" | "adapts";
};

export type EvidenceGraph = {
  nodes: string[];
  edges: GraphEdge[];
};

export type ConfidenceBreakdown = {
  meaning: number | null;
  development: number | null;
  adaptive: number | null;
  conversation: number | null;
  overall: number;
};

export type EvidenceSnapshot = {
  evidenceEngineVersion: typeof EVIDENCE_ENGINE_VERSION | string;
  generatedAt: string;
  level: ExplanationLevel;
  engineVersions: {
    meaning?: string | null;
    development?: string | null;
    adaptive?: string | null;
    conversation?: string | null;
    evidence: string;
  };
  ruleTrace: EvidenceNode[];
  dependencyGraph: EvidenceGraph;
  confidenceBreakdown: ConfidenceBreakdown;
  /** Level-specific projections (no parent-facing prose). */
  views: {
    compact: string[];
    debug: string[];
    developer: string[];
  };
};

export type ExplainabilityEngineInput = {
  astronomy?: MeaningAstronomyInput | null;
  meaning?: MeaningSnapshot | null;
  development?: DevelopmentSnapshot | null;
  adaptive?: AdaptiveSnapshot | null;
  conversation?: ConversationPlan | null;
  level?: ExplanationLevel;
  evidenceSnapshot?: EvidenceSnapshot | null;
};
