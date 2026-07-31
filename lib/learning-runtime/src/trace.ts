import type { LearningEvent } from "@workspace/learning-events";
import type { RuleFireResult } from "./rules.js";
import type { RuleSkipReason } from "./rule-evaluation.js";
import type {
  ChildRuntimeState,
  LearningDecision,
  NormalizedSignal,
  RuntimeInputSnapshots,
  RuntimeRule,
} from "./types.js";

export const RUNTIME_TRACE_SCHEMA_VERSION = 1 as const;

export type RuntimeTraceFrame = {
  schemaVersion: typeof RUNTIME_TRACE_SCHEMA_VERSION;
  id: string;
  at: string;
  childId: string;
  sessionId: string | null;
  /** Monotonic per-runtime snapshot version at capture time. */
  snapshotVersion: number;
  event: LearningEvent;
  normalized: NormalizedSignal;
  snapshots: RuntimeInputSnapshots | null;
  stateBefore: ChildRuntimeState;
  stateAfter: ChildRuntimeState;
  matchedRules: Array<{
    ruleId: string;
    priority: number;
    reason: string;
  }>;
  skippedRules: RuleSkipReason[];
  decision: LearningDecision;
  featureFlags: Record<string, boolean>;
  ruleDependencies: Array<{ ruleId: string; dependsOn: string[] }>;
  knowledgeDelta: {
    strugglingAdded: string[];
    forgottenAdded: string[];
    masteredAdded: string[];
  };
  attentionState: {
    classification: string | null;
    score: number | null;
    suggestBreak: boolean;
  };
  latencyMs: number;
};

export type RuntimeTracer = (frame: RuntimeTraceFrame) => void;

export function buildKnowledgeDelta(
  before: RuntimeInputSnapshots | null | undefined,
  after: RuntimeInputSnapshots | null | undefined,
): RuntimeTraceFrame["knowledgeDelta"] {
  const prevS = new Set(before?.knowledge?.strugglingNodeIds ?? []);
  const prevF = new Set(before?.knowledge?.forgottenNodeIds ?? []);
  const prevM = new Set(before?.knowledge?.masteredNodeIds ?? []);
  const nextS = after?.knowledge?.strugglingNodeIds ?? [];
  const nextF = after?.knowledge?.forgottenNodeIds ?? [];
  const nextM = after?.knowledge?.masteredNodeIds ?? [];
  return {
    strugglingAdded: nextS.filter((id) => !prevS.has(id)),
    forgottenAdded: nextF.filter((id) => !prevF.has(id)),
    masteredAdded: nextM.filter((id) => !prevM.has(id)),
  };
}

export function compactMatchedRules(
  matched: RuleFireResult[],
): RuntimeTraceFrame["matchedRules"] {
  return matched.map((m) => ({
    ruleId: m.ruleId,
    priority: m.priority,
    reason: m.patch.reason,
  }));
}

export function ruleDependencyIndex(
  rules: RuntimeRule[],
): RuntimeTraceFrame["ruleDependencies"] {
  return rules.map((r) => ({
    ruleId: r.id,
    dependsOn: r.dependsOn ?? [],
  }));
}
