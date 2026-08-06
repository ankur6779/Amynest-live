/**
 * Decision Bridge — reference resolution only.
 * Architecture Freeze v1.0 · Sprint A8.2.
 *
 * Matches Brain recommendations to Registry Adapter snapshots.
 * Never executes. Never mutates Brain or Registries.
 */

import type { AttentionBudgetResult } from "@/v2/amy-decision/attention-budget/types";
import type { AmyDecision } from "@/v2/amy-decision/types";
import type {
  AdaptedFeature,
  AdaptedRoute,
  AdaptedTool,
  FeatureRegistrySnapshot,
  RouteRegistrySnapshot,
  ToolRegistrySnapshot,
} from "@/v2/registry-adapters/types";

export const AMY_DECISION_BRIDGE_VERSION = "amy_decision_bridge.v1" as const;

export type MissingReferenceKind =
  | "experience"
  | "feature"
  | "tool"
  | "route";

export type MissingReferenceReason =
  | "UNKNOWN_EXPERIENCE"
  | "NOT_IN_REGISTRY"
  | "DUPLICATE_FEATURE_MAPPING"
  | "DUPLICATE_ROUTE_MAPPING"
  | "EMPTY_REGISTRY";

export type MissingReference = Readonly<{
  kind: MissingReferenceKind;
  id: string;
  experienceId: string | null;
  reason: MissingReferenceReason;
}>;

/**
 * Provenance on every bridge-resolved object — machine only.
 * Never UI. Never AI.
 */
export type DecisionBridgeProvenance = Readonly<{
  resolvedByBridgeVersion: typeof AMY_DECISION_BRIDGE_VERSION;
  /** From Registry Adapter snapshot — machine only. */
  adapterVersion: string;
  /** From AmyDecision.decisionVersion — machine only. */
  brainDecisionVersion: string;
  resolvedAt: string;
}>;

export type ResolvedSlot = Readonly<{
  experienceId: string;
  sourceSlot: "hero" | "secondary" | "passive";
  promoted: boolean;
  features: ReadonlyArray<AdaptedFeature>;
  tools: ReadonlyArray<AdaptedTool>;
  routes: ReadonlyArray<AdaptedRoute>;
  /** Machine-only provenance. */
  provenance: DecisionBridgeProvenance;
}>;

/**
 * One machine-readable step in Experience → Feature → Tool → Route → Missing.
 * Developer / QA only — never UI, never AI.
 */
export type DecisionResolutionTraceOutcome =
  | "RESOLVED"
  | "MISSING"
  | "DUPLICATE"
  | "UNKNOWN";

export type DecisionResolutionTraceStepKind =
  | "experience"
  | "feature"
  | "tool"
  | "route"
  | "missing";

export type DecisionResolutionTraceSlot =
  | "hero"
  | "secondary"
  | "passive"
  | "decision";

export type DecisionResolutionTraceStep = Readonly<{
  kind: DecisionResolutionTraceStepKind;
  /** Budget slot or decision-level union resolution. */
  slot: DecisionResolutionTraceSlot | null;
  experienceId: string | null;
  id: string;
  outcome: DecisionResolutionTraceOutcome;
  reason: MissingReferenceReason | null;
}>;

/**
 * Machine-readable resolution flow trace.
 * Developer only. Never UI. Never AI.
 */
export type DecisionResolutionTrace = Readonly<{
  kind: "amy_decision_resolution_trace.v1";
  steps: ReadonlyArray<DecisionResolutionTraceStep>;
}>;

export type ResolvedDecision = Readonly<{
  decisionId: string;
  stabilityToken: string | null;
  hero: ResolvedSlot | null;
  secondary: ResolvedSlot | null;
  passive: ResolvedSlot | null;
  resolvedFeatures: ReadonlyArray<AdaptedFeature>;
  resolvedTools: ReadonlyArray<AdaptedTool>;
  resolvedRoutes: ReadonlyArray<AdaptedRoute>;
  missingReferences: ReadonlyArray<MissingReference>;
  /**
   * Machine-readable Experience → Feature → Tool → Route → Missing flow.
   * Developer only. Never UI. Never AI.
   */
  resolutionTrace: DecisionResolutionTrace;
  /** Machine-only provenance. */
  provenance: DecisionBridgeProvenance;
  bridgeVersion: typeof AMY_DECISION_BRIDGE_VERSION;
  resolvedAt: string;
}>;

export type ResolveDecisionInput = Readonly<{
  decision: AmyDecision;
  budget: AttentionBudgetResult;
  features: FeatureRegistrySnapshot;
  tools: ToolRegistrySnapshot;
  routes: RouteRegistrySnapshot;
  /** From StableDecisionResult when available. */
  stabilityToken?: string | null;
}>;

export type ResolveDecisionOptions = Readonly<{
  now?: Date;
}>;

export type DecisionBridgeHealth = Readonly<{
  resolvedFeatureCount: number;
  resolvedToolCount: number;
  resolvedRouteCount: number;
  missingFeatureCount: number;
  missingToolCount: number;
  missingRouteCount: number;
  bridgeVersion: typeof AMY_DECISION_BRIDGE_VERSION;
}>;

export type ResolvedDecisionValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ResolvedDecisionValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<ResolvedDecisionValidationIssue>;
}>;

export type ResolvedDecisionDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type DecisionResolutionExplanation = Readonly<{
  decisionId: string;
  stabilityToken: string | null;
  heroExperienceId: string | null;
  secondaryExperienceId: string | null;
  passiveExperienceId: string | null;
  resolvedFeatureCount: number;
  resolvedToolCount: number;
  resolvedRouteCount: number;
  missingCount: number;
  missingReferences: ReadonlyArray<MissingReference>;
  resolutionTrace: DecisionResolutionTrace;
  provenance: DecisionBridgeProvenance;
  bridgeVersion: typeof AMY_DECISION_BRIDGE_VERSION;
}>;
