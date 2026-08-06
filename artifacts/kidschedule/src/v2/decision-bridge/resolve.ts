/**
 * resolveDecision — pure reference matcher.
 * Brain owns WHAT; Adapters own WHAT exists; Bridge only matches.
 * Never throws. Never invents missing references.
 */

import { AMY_EXPERIENCE_REFS } from "@/v2/amy-decision/policy";
import type { AttentionBudgetExperienceRef } from "@/v2/amy-decision/attention-budget/types";
import type {
  AdaptedFeature,
  AdaptedRoute,
  AdaptedTool,
} from "@/v2/registry-adapters/types";
import { AMY_REGISTRY_ADAPTER_VERSION } from "@/v2/registry-adapters/types";
import { freezeDeep } from "./freeze";
import {
  AMY_DECISION_BRIDGE_VERSION,
  type DecisionBridgeProvenance,
  type DecisionResolutionTraceStep,
  type DecisionResolutionTraceSlot,
  type MissingReference,
  type ResolveDecisionInput,
  type ResolveDecisionOptions,
  type ResolvedDecision,
  type ResolvedSlot,
} from "./types";

type ExperienceRefs = {
  featureIds: readonly string[];
  routeIds: readonly string[];
  toolIds: readonly string[];
};

function refsForExperience(experienceId: string): ExperienceRefs | null {
  const refs = AMY_EXPERIENCE_REFS[experienceId];
  if (!refs) return null;
  return refs;
}

function indexFeatures(
  features: ReadonlyArray<AdaptedFeature>,
): Map<string, AdaptedFeature[]> {
  const map = new Map<string, AdaptedFeature[]>();
  for (const f of features) {
    const list = map.get(f.featureId) ?? [];
    list.push(f);
    map.set(f.featureId, list);
  }
  return map;
}

function indexTools(
  tools: ReadonlyArray<AdaptedTool>,
): Map<string, AdaptedTool[]> {
  const map = new Map<string, AdaptedTool[]>();
  for (const t of tools) {
    const list = map.get(t.toolId) ?? [];
    list.push(t);
    map.set(t.toolId, list);
  }
  return map;
}

function indexRoutes(
  routes: ReadonlyArray<AdaptedRoute>,
): {
  byPath: Map<string, AdaptedRoute[]>;
  byRouteId: Map<string, AdaptedRoute[]>;
} {
  const byPath = new Map<string, AdaptedRoute[]>();
  const byRouteId = new Map<string, AdaptedRoute[]>();
  for (const r of routes) {
    const pathList = byPath.get(r.path) ?? [];
    pathList.push(r);
    byPath.set(r.path, pathList);

    const idList = byRouteId.get(r.routeId) ?? [];
    idList.push(r);
    byRouteId.set(r.routeId, idList);
  }
  return { byPath, byRouteId };
}

function pushMissing(
  missing: MissingReference[],
  seen: Set<string>,
  ref: MissingReference,
): void {
  const key = `${ref.kind}:${ref.id}:${ref.reason}:${ref.experienceId ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  missing.push(ref);
}

function pushTrace(
  steps: DecisionResolutionTraceStep[],
  step: DecisionResolutionTraceStep,
): void {
  steps.push(freezeDeep(step));
}

function makeProvenance(
  brainDecisionVersion: string,
  adapterVersion: string,
  resolvedAt: string,
): DecisionBridgeProvenance {
  return freezeDeep({
    resolvedByBridgeVersion: AMY_DECISION_BRIDGE_VERSION,
    adapterVersion,
    brainDecisionVersion,
    resolvedAt,
  });
}

function resolveSlot(
  slotRef: AttentionBudgetExperienceRef | null,
  sourceSlot: "hero" | "secondary" | "passive",
  featureIndex: Map<string, AdaptedFeature[]>,
  toolIndex: Map<string, AdaptedTool[]>,
  routeIndex: ReturnType<typeof indexRoutes>,
  missing: MissingReference[],
  missingSeen: Set<string>,
  collectedFeatures: Map<string, AdaptedFeature>,
  collectedTools: Map<string, AdaptedTool>,
  collectedRoutes: Map<string, AdaptedRoute>,
  featureClaim: Map<string, string>,
  routeClaim: Map<string, string>,
  emptyFeatures: boolean,
  emptyTools: boolean,
  emptyRoutes: boolean,
  provenance: DecisionBridgeProvenance,
  trace: DecisionResolutionTraceStep[],
): ResolvedSlot | null {
  if (!slotRef) return null;

  const experienceId = slotRef.experienceId;
  const refs = refsForExperience(experienceId);
  if (!refs) {
    pushMissing(missing, missingSeen, {
      kind: "experience",
      id: experienceId,
      experienceId,
      reason: "UNKNOWN_EXPERIENCE",
    });
    pushTrace(trace, {
      kind: "experience",
      slot: sourceSlot,
      experienceId,
      id: experienceId,
      outcome: "UNKNOWN",
      reason: "UNKNOWN_EXPERIENCE",
    });
    return freezeDeep({
      experienceId,
      sourceSlot,
      promoted: slotRef.promoted,
      features: Object.freeze([]),
      tools: Object.freeze([]),
      routes: Object.freeze([]),
      provenance,
    });
  }

  pushTrace(trace, {
    kind: "experience",
    slot: sourceSlot,
    experienceId,
    id: experienceId,
    outcome: "RESOLVED",
    reason: null,
  });

  const slotFeatures: AdaptedFeature[] = [];
  const slotTools: AdaptedTool[] = [];
  const slotRoutes: AdaptedRoute[] = [];

  for (const featureId of refs.featureIds) {
    if (emptyFeatures) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: sourceSlot,
        experienceId,
        id: featureId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const matches = featureIndex.get(featureId);
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: sourceSlot,
        experienceId,
        id: featureId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    const claimedBy = featureClaim.get(featureId);
    if (claimedBy != null) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId,
        reason: "DUPLICATE_FEATURE_MAPPING",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: sourceSlot,
        experienceId,
        id: featureId,
        outcome: "DUPLICATE",
        reason: "DUPLICATE_FEATURE_MAPPING",
      });
      const existing = collectedFeatures.get(featureId);
      if (existing) slotFeatures.push(existing);
      continue;
    }
    featureClaim.set(featureId, experienceId);
    if (matches.length > 1) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId,
        reason: "DUPLICATE_FEATURE_MAPPING",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: sourceSlot,
        experienceId,
        id: featureId,
        outcome: "DUPLICATE",
        reason: "DUPLICATE_FEATURE_MAPPING",
      });
    } else {
      pushTrace(trace, {
        kind: "feature",
        slot: sourceSlot,
        experienceId,
        id: featureId,
        outcome: "RESOLVED",
        reason: null,
      });
    }
    const chosen = matches[0]!;
    slotFeatures.push(chosen);
    collectedFeatures.set(featureId, chosen);
  }

  for (const toolId of refs.toolIds) {
    if (emptyTools) {
      pushMissing(missing, missingSeen, {
        kind: "tool",
        id: toolId,
        experienceId,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "tool",
        slot: sourceSlot,
        experienceId,
        id: toolId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const matches = toolIndex.get(toolId);
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "tool",
        id: toolId,
        experienceId,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "tool",
        slot: sourceSlot,
        experienceId,
        id: toolId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    const chosen = matches[0]!;
    slotTools.push(chosen);
    collectedTools.set(toolId, chosen);
    pushTrace(trace, {
      kind: "tool",
      slot: sourceSlot,
      experienceId,
      id: toolId,
      outcome: "RESOLVED",
      reason: null,
    });
  }

  for (const routeId of refs.routeIds) {
    if (emptyRoutes) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "route",
        slot: sourceSlot,
        experienceId,
        id: routeId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const byPath = routeIndex.byPath.get(routeId);
    const byId = routeIndex.byRouteId.get(routeId);
    const matches = byPath ?? byId;
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "route",
        slot: sourceSlot,
        experienceId,
        id: routeId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    const claimedBy = routeClaim.get(routeId);
    if (claimedBy != null) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId,
        reason: "DUPLICATE_ROUTE_MAPPING",
      });
      pushTrace(trace, {
        kind: "route",
        slot: sourceSlot,
        experienceId,
        id: routeId,
        outcome: "DUPLICATE",
        reason: "DUPLICATE_ROUTE_MAPPING",
      });
      const existing = collectedRoutes.get(routeId);
      if (existing) slotRoutes.push(existing);
      continue;
    }
    routeClaim.set(routeId, experienceId);
    if (matches.length > 1) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId,
        reason: "DUPLICATE_ROUTE_MAPPING",
      });
      pushTrace(trace, {
        kind: "route",
        slot: sourceSlot,
        experienceId,
        id: routeId,
        outcome: "DUPLICATE",
        reason: "DUPLICATE_ROUTE_MAPPING",
      });
    } else {
      pushTrace(trace, {
        kind: "route",
        slot: sourceSlot,
        experienceId,
        id: routeId,
        outcome: "RESOLVED",
        reason: null,
      });
    }
    const chosen = matches[0]!;
    slotRoutes.push(chosen);
    collectedRoutes.set(routeId, chosen);
  }

  return freezeDeep({
    experienceId,
    sourceSlot,
    promoted: slotRef.promoted,
    features: Object.freeze([...slotFeatures]),
    tools: Object.freeze([...slotTools]),
    routes: Object.freeze([...slotRoutes]),
    provenance,
  });
}

/**
 * Resolve Brain Decision + Budget against Registry Adapter snapshots.
 * Pure · deterministic · never throws.
 */
export function resolveDecision(
  input: ResolveDecisionInput,
  options: ResolveDecisionOptions = {},
): ResolvedDecision {
  const now = options.now ?? new Date();
  const resolvedAt = now.toISOString();
  const missing: MissingReference[] = [];
  const missingSeen = new Set<string>();
  const trace: DecisionResolutionTraceStep[] = [];

  const brainDecisionVersion =
    typeof input.decision.decisionVersion === "string"
      ? input.decision.decisionVersion
      : "unknown";
  const adapterVersion =
    input.features.adapterVersion ||
    input.tools.adapterVersion ||
    input.routes.adapterVersion ||
    AMY_REGISTRY_ADAPTER_VERSION;
  const provenance = makeProvenance(
    brainDecisionVersion,
    adapterVersion,
    resolvedAt,
  );

  const emptyFeatures = input.features.features.length === 0;
  const emptyTools = input.tools.tools.length === 0;
  const emptyRoutes = input.routes.routes.length === 0;

  const featureIndex = indexFeatures(input.features.features);
  const toolIndex = indexTools(input.tools.tools);
  const routeIndex = indexRoutes(input.routes.routes);

  const collectedFeatures = new Map<string, AdaptedFeature>();
  const collectedTools = new Map<string, AdaptedTool>();
  const collectedRoutes = new Map<string, AdaptedRoute>();
  const featureClaim = new Map<string, string>();
  const routeClaim = new Map<string, string>();

  const hero = resolveSlot(
    input.budget.heroExperience,
    "hero",
    featureIndex,
    toolIndex,
    routeIndex,
    missing,
    missingSeen,
    collectedFeatures,
    collectedTools,
    collectedRoutes,
    featureClaim,
    routeClaim,
    emptyFeatures,
    emptyTools,
    emptyRoutes,
    provenance,
    trace,
  );
  const secondary = resolveSlot(
    input.budget.secondaryExperience,
    "secondary",
    featureIndex,
    toolIndex,
    routeIndex,
    missing,
    missingSeen,
    collectedFeatures,
    collectedTools,
    collectedRoutes,
    featureClaim,
    routeClaim,
    emptyFeatures,
    emptyTools,
    emptyRoutes,
    provenance,
    trace,
  );
  const passive = resolveSlot(
    input.budget.passiveExperience,
    "passive",
    featureIndex,
    toolIndex,
    routeIndex,
    missing,
    missingSeen,
    collectedFeatures,
    collectedTools,
    collectedRoutes,
    featureClaim,
    routeClaim,
    emptyFeatures,
    emptyTools,
    emptyRoutes,
    provenance,
    trace,
  );

  // Also resolve Decision recommended ids (union, no invent)
  for (const featureId of input.decision.recommendedFeatureIds) {
    if (collectedFeatures.has(featureId)) continue;
    if (emptyFeatures) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId: null,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: "decision",
        experienceId: null,
        id: featureId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const matches = featureIndex.get(featureId);
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "feature",
        id: featureId,
        experienceId: null,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "feature",
        slot: "decision",
        experienceId: null,
        id: featureId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    collectedFeatures.set(featureId, matches[0]!);
    pushTrace(trace, {
      kind: "feature",
      slot: "decision",
      experienceId: null,
      id: featureId,
      outcome: "RESOLVED",
      reason: null,
    });
  }

  for (const toolId of input.decision.recommendedToolIds) {
    if (collectedTools.has(toolId)) continue;
    if (emptyTools) {
      pushMissing(missing, missingSeen, {
        kind: "tool",
        id: toolId,
        experienceId: null,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "tool",
        slot: "decision",
        experienceId: null,
        id: toolId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const matches = toolIndex.get(toolId);
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "tool",
        id: toolId,
        experienceId: null,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "tool",
        slot: "decision",
        experienceId: null,
        id: toolId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    collectedTools.set(toolId, matches[0]!);
    pushTrace(trace, {
      kind: "tool",
      slot: "decision",
      experienceId: null,
      id: toolId,
      outcome: "RESOLVED",
      reason: null,
    });
  }

  for (const routeId of input.decision.recommendedRouteIds) {
    if (collectedRoutes.has(routeId)) continue;
    if (emptyRoutes) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId: null,
        reason: "EMPTY_REGISTRY",
      });
      pushTrace(trace, {
        kind: "route",
        slot: "decision",
        experienceId: null,
        id: routeId,
        outcome: "MISSING",
        reason: "EMPTY_REGISTRY",
      });
      continue;
    }
    const matches =
      routeIndex.byPath.get(routeId) ?? routeIndex.byRouteId.get(routeId);
    if (!matches || matches.length === 0) {
      pushMissing(missing, missingSeen, {
        kind: "route",
        id: routeId,
        experienceId: null,
        reason: "NOT_IN_REGISTRY",
      });
      pushTrace(trace, {
        kind: "route",
        slot: "decision",
        experienceId: null,
        id: routeId,
        outcome: "MISSING",
        reason: "NOT_IN_REGISTRY",
      });
      continue;
    }
    collectedRoutes.set(routeId, matches[0]!);
    pushTrace(trace, {
      kind: "route",
      slot: "decision",
      experienceId: null,
      id: routeId,
      outcome: "RESOLVED",
      reason: null,
    });
  }

  // Terminal section: Missing references (machine summary of soft failures)
  for (const ref of missing) {
    pushTrace(trace, {
      kind: "missing",
      slot: null,
      experienceId: ref.experienceId,
      id: ref.id,
      outcome: "MISSING",
      reason: ref.reason,
    });
  }

  return freezeDeep({
    decisionId: input.decision.decisionId,
    stabilityToken: input.stabilityToken ?? null,
    hero,
    secondary,
    passive,
    resolvedFeatures: Object.freeze([...collectedFeatures.values()]),
    resolvedTools: Object.freeze([...collectedTools.values()]),
    resolvedRoutes: Object.freeze([...collectedRoutes.values()]),
    missingReferences: Object.freeze([...missing]),
    resolutionTrace: freezeDeep({
      kind: "amy_decision_resolution_trace.v1" as const,
      steps: Object.freeze([...trace]),
    }),
    provenance,
    bridgeVersion: AMY_DECISION_BRIDGE_VERSION,
    resolvedAt,
  });
}
