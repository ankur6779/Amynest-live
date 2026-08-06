import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { resolveAmyContext, type AmyContext } from "@/v2/amy-context";
import {
  clearAmyMemoryForTests,
  createEmptyAmyMemory,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "@/v2/amy-memory";
import { computeContextVersion } from "@/v2/amy-memory/context-version";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  AMY_EXPERIENCE,
  allocateAttentionBudget,
  createAmyDecision,
  stabilizeAmyDecision,
  type DecisionCooldownResult,
} from "@/v2/amy-decision";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  FEATURE_REGISTRY_VERSION,
  ROUTE_REGISTRY_VERSION,
  TOOL_REGISTRY_VERSION,
  adaptFeatureRegistry,
  adaptRouteRegistry,
  adaptToolRegistry,
} from "@/v2/registry-adapters";
import {
  AMY_DECISION_BRIDGE_VERSION,
  clearResolvedDecisionSnapshotForTests,
  compareResolvedDecisions,
  explainDecisionResolution,
  getBridgeHealth,
  getMissingReferences,
  getResolvedDecisionSnapshot,
  isAmyDecisionBridgeEnabled,
  rememberResolvedDecisionSnapshot,
  resolveDecision,
  validateResolvedDecision,
} from "./index";

function freezeDoc(doc: AmyMemoryMutable): AmyMemoryDocument {
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return Object.freeze(
    JSON.parse(JSON.stringify(doc)),
  ) as AmyMemoryDocument;
}

function contextFrom(
  mutate?: (doc: AmyMemoryMutable) => void,
  now = new Date(2026, 7, 2, 12, 0, 0),
): AmyContext {
  const doc = createEmptyAmyMemory({ guestId: "bridge-guest-1" });
  mutate?.(doc);
  return resolveAmyContext(freezeDoc(doc), { now });
}

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function noneCooldown(experienceId: string): DecisionCooldownResult {
  return Object.freeze({
    experienceId,
    cooldownState: "NONE",
    cooldownPolicy: null,
    startedAt: null,
    expiresAt: null,
    dismissCount: 0,
    eligibleAgain: true,
    cooldownReason: "NO_COOLDOWN",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

function missionCompleteBundle() {
  const day = "2026-08-02";
  const ctx = contextFrom((d) => {
    d.challenge.worryId = "behavior";
    d.mission.missionId = "speech_name_three";
    d.mission.dateKey = day;
    d.mission.completedAt = FIXED_NOW.toISOString();
    d.speech.todayMissionStatus = "completed";
    d.coach.status = "prepared";
    d.coach.prepared = {
      goalId: "toddler-tantrums",
      goalTitle: "Toddler Tantrums",
      categoryId: "toddler-behavior",
      worryId: "behavior",
      challengeLabel: "Behaviour",
      preparedAt: FIXED_NOW.toISOString(),
      gateDismissed: false,
    };
  });
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  const stable = stabilizeAmyDecision(
    { context: ctx, currentDecision: decision },
    { now: FIXED_NOW },
  );
  const budget = allocateAttentionBudget(
    {
      stable,
      cooldown: noneCooldown(decision.primaryExperience.experienceId),
    },
    { now: FIXED_NOW },
  );
  return { ctx, decision, stable, budget };
}

describe("Decision Bridge (Sprint A8.2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearResolvedDecisionSnapshotForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_decision_bridge_v2")).toBe(false);
    expect(isAmyDecisionBridgeEnabled()).toBe(false);
  });

  it("valid resolution", () => {
    const { decision, stable, budget } = missionCompleteBundle();
    const features = adaptFeatureRegistry({ now: FIXED_NOW });
    const tools = adaptToolRegistry({ now: FIXED_NOW });
    const routes = adaptRouteRegistry({ now: FIXED_NOW });

    const resolved = resolveDecision(
      {
        decision,
        budget,
        features,
        tools,
        routes,
        stabilityToken: stable.stabilityToken,
      },
      { now: FIXED_NOW },
    );

    expect(resolved.decisionId).toBe(decision.decisionId);
    expect(resolved.stabilityToken).toBe(stable.stabilityToken);
    expect(resolved.bridgeVersion).toBe(AMY_DECISION_BRIDGE_VERSION);
    expect(resolved.hero?.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(resolved.resolvedFeatures.length).toBeGreaterThan(0);
    expect(resolved.resolvedRoutes.length).toBeGreaterThan(0);
    expect(
      resolved.resolvedFeatures.some((f) => f.featureId === "amy_coach"),
    ).toBe(true);
    expect(validateResolvedDecision(resolved).ok).toBe(true);
    expect(Object.isFrozen(resolved)).toBe(true);

    // P1 — provenance on every resolved object (machine only)
    expect(resolved.provenance).toMatchObject({
      resolvedByBridgeVersion: AMY_DECISION_BRIDGE_VERSION,
      adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
      brainDecisionVersion: decision.decisionVersion,
      resolvedAt: FIXED_NOW.toISOString(),
    });
    expect(resolved.hero?.provenance).toEqual(resolved.provenance);
    if (resolved.secondary) {
      expect(resolved.secondary.provenance).toEqual(resolved.provenance);
    }
    if (resolved.passive) {
      expect(resolved.passive.provenance).toEqual(resolved.provenance);
    }

    // P1 — resolutionTrace (developer only)
    expect(resolved.resolutionTrace.kind).toBe(
      "amy_decision_resolution_trace.v1",
    );
    expect(resolved.resolutionTrace.steps.length).toBeGreaterThan(0);
    expect(resolved.resolutionTrace.steps[0]).toMatchObject({
      kind: "experience",
      slot: "hero",
      outcome: "RESOLVED",
    });
    expect(
      resolved.resolutionTrace.steps.some((s) => s.kind === "feature"),
    ).toBe(true);
    expect(
      resolved.resolutionTrace.steps.some((s) => s.kind === "route"),
    ).toBe(true);
    expect(Object.isFrozen(resolved.resolutionTrace)).toBe(true);

    const health = getBridgeHealth(resolved);
    expect(health.resolvedFeatureCount).toBe(resolved.resolvedFeatures.length);
    expect(health.bridgeVersion).toBe(AMY_DECISION_BRIDGE_VERSION);
  });

  it("missing Feature", () => {
    const { decision, budget } = missionCompleteBundle();
    const features = adaptFeatureRegistry({
      now: FIXED_NOW,
      entries: [], // empty feature catalog for this experience's ids
    });
    const routes = adaptRouteRegistry({ now: FIXED_NOW });
    const tools = adaptToolRegistry({ now: FIXED_NOW });

    const resolved = resolveDecision(
      { decision, budget, features, tools, routes },
      { now: FIXED_NOW },
    );
    expect(
      resolved.missingReferences.some(
        (m) => m.kind === "feature" && m.reason === "EMPTY_REGISTRY",
      ),
    ).toBe(true);
    expect(resolved.resolvedFeatures).toHaveLength(0);
  });

  it("missing Tool", () => {
    const { decision, budget } = missionCompleteBundle();
    // Inject a decision-like tool ref via experience that has no tools (coach has [])
    // Use injectable tools empty + fabricate missing via recommendedToolIds
    const decisionWithTool = {
      ...decision,
      recommendedToolIds: Object.freeze(["nonexistent_tool"]),
    };
    const resolved = resolveDecision(
      {
        decision: decisionWithTool,
        budget,
        features: adaptFeatureRegistry({ now: FIXED_NOW }),
        tools: adaptToolRegistry({ now: FIXED_NOW }),
        routes: adaptRouteRegistry({ now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    expect(
      resolved.missingReferences.some(
        (m) =>
          m.kind === "tool" &&
          m.id === "nonexistent_tool" &&
          (m.reason === "NOT_IN_REGISTRY" || m.reason === "EMPTY_REGISTRY"),
      ),
    ).toBe(true);
  });

  it("missing Route", () => {
    const { decision, budget } = missionCompleteBundle();
    const decisionWithRoute = {
      ...decision,
      recommendedRouteIds: Object.freeze(["/does-not-exist"]),
    };
    const resolved = resolveDecision(
      {
        decision: decisionWithRoute,
        budget,
        features: adaptFeatureRegistry({ now: FIXED_NOW }),
        tools: adaptToolRegistry({ now: FIXED_NOW }),
        routes: adaptRouteRegistry({ now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    expect(
      resolved.missingReferences.some(
        (m) => m.kind === "route" && m.id === "/does-not-exist",
      ),
    ).toBe(true);
  });

  it("unknown Experience", () => {
    const { decision, budget } = missionCompleteBundle();
    const weirdBudget = {
      ...budget,
      heroExperience: {
        experienceId: "not_a_real_experience",
        sourceSlot: "hero" as const,
        promoted: false,
      },
    };
    const resolved = resolveDecision(
      {
        decision,
        budget: weirdBudget,
        features: adaptFeatureRegistry({ now: FIXED_NOW }),
        tools: adaptToolRegistry({ now: FIXED_NOW }),
        routes: adaptRouteRegistry({ now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    expect(
      resolved.missingReferences.some(
        (m) =>
          m.kind === "experience" &&
          m.id === "not_a_real_experience" &&
          m.reason === "UNKNOWN_EXPERIENCE",
      ),
    ).toBe(true);
    expect(resolved.hero?.experienceId).toBe("not_a_real_experience");
    expect(resolved.hero?.features).toHaveLength(0);
    expect(
      resolved.resolutionTrace.steps.some(
        (s) =>
          s.kind === "experience" &&
          s.outcome === "UNKNOWN" &&
          s.id === "not_a_real_experience",
      ),
    ).toBe(true);
    expect(
      resolved.resolutionTrace.steps.some(
        (s) =>
          s.kind === "missing" &&
          s.reason === "UNKNOWN_EXPERIENCE" &&
          s.id === "not_a_real_experience",
      ),
    ).toBe(true);
  });

  it("duplicate Feature mapping across experiences", () => {
    const { decision, budget } = missionCompleteBundle();
    // Force secondary to claim a feature already used by hero by pointing both
    // at experiences that share nothing normally — inject duplicate via custom refs
    // Simulate by resolving hero+secondary where secondary experience maps to
    // amy_coach feature already claimed — use same experience for secondary.
    const dupBudget = {
      ...budget,
      secondaryExperience: {
        experienceId: AMY_EXPERIENCE.AMY_COACH,
        sourceSlot: "secondary" as const,
        promoted: true,
      },
    };
    const resolved = resolveDecision(
      {
        decision,
        budget: dupBudget,
        features: adaptFeatureRegistry({ now: FIXED_NOW }),
        tools: adaptToolRegistry({ now: FIXED_NOW }),
        routes: adaptRouteRegistry({ now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    // First claim wins; second experience notes duplicate on shared feature/route ids
    expect(
      resolved.missingReferences.some(
        (m) =>
          m.reason === "DUPLICATE_FEATURE_MAPPING" ||
          m.reason === "DUPLICATE_ROUTE_MAPPING",
      ),
    ).toBe(true);
  });

  it("duplicate Route mapping in registry catalog", () => {
    const { decision, budget } = missionCompleteBundle();
    const routes = adaptRouteRegistry({
      now: FIXED_NOW,
      entries: [
        {
          path: "/amy-coach",
          owner: "feature",
          featureId: "amy_coach",
          lifecycle: "canonical",
        },
        {
          path: "/amy-coach",
          owner: "feature",
          featureId: "amy_coach",
          lifecycle: "alias",
          notes: "dup",
        },
      ],
    });
    const resolved = resolveDecision(
      {
        decision,
        budget,
        features: adaptFeatureRegistry({ now: FIXED_NOW }),
        tools: adaptToolRegistry({ now: FIXED_NOW }),
        routes,
      },
      { now: FIXED_NOW },
    );
    expect(
      resolved.missingReferences.some(
        (m) => m.reason === "DUPLICATE_ROUTE_MAPPING",
      ),
    ).toBe(true);
    expect(resolved.resolvedRoutes.some((r) => r.path === "/amy-coach")).toBe(
      true,
    );
  });

  it("empty Registry — continues without throw", () => {
    const { decision, budget } = missionCompleteBundle();
    const resolved = resolveDecision(
      {
        decision,
        budget,
        features: {
          adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
          registryVersion: FEATURE_REGISTRY_VERSION,
          generatedAt: FIXED_NOW.toISOString(),
          features: Object.freeze([]),
          unknownFeatures: 0,
          ignoredFields: 0,
        },
        tools: {
          adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
          registryVersion: TOOL_REGISTRY_VERSION,
          generatedAt: FIXED_NOW.toISOString(),
          tools: Object.freeze([]),
          usingEmptyCatalog: true,
          ignoredFields: 0,
        },
        routes: {
          adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
          registryVersion: ROUTE_REGISTRY_VERSION,
          generatedAt: FIXED_NOW.toISOString(),
          routes: Object.freeze([]),
          ignoredFields: 0,
        },
      },
      { now: FIXED_NOW },
    );
    expect(resolved.missingReferences.length).toBeGreaterThan(0);
    expect(resolved.resolvedFeatures).toHaveLength(0);
    expect(resolved.resolvedRoutes).toHaveLength(0);
    expect(() => getMissingReferences(resolved)).not.toThrow();
  });

  it("readonly outputs + deterministic snapshots", () => {
    const { decision, stable, budget } = missionCompleteBundle();
    const input = {
      decision,
      budget,
      features: adaptFeatureRegistry({ now: FIXED_NOW }),
      tools: adaptToolRegistry({ now: FIXED_NOW }),
      routes: adaptRouteRegistry({ now: FIXED_NOW }),
      stabilityToken: stable.stabilityToken,
    };
    const a = resolveDecision(input, { now: FIXED_NOW });
    const b = resolveDecision(input, {
      now: new Date(FIXED_NOW.getTime() + 5000),
    });
    expect(compareResolvedDecisions(a, b)).toEqual([]);
    expect(() => {
      (a as { decisionId: string }).decisionId = "x";
    }).toThrow();

    rememberResolvedDecisionSnapshot(a);
    expect(getResolvedDecisionSnapshot()?.decisionId).toBe(a.decisionId);

    const explanation = explainDecisionResolution(input, { now: FIXED_NOW });
    expect(explanation.heroExperienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(explanation.missingCount).toBe(a.missingReferences.length);
    expect(explanation.resolutionTrace.kind).toBe(
      "amy_decision_resolution_trace.v1",
    );
    expect(explanation.provenance.resolvedByBridgeVersion).toBe(
      AMY_DECISION_BRIDGE_VERSION,
    );
  });

  it("never mutates Brain Decision or Registry snapshots", () => {
    const { decision, budget } = missionCompleteBundle();
    const features = adaptFeatureRegistry({ now: FIXED_NOW });
    const tools = adaptToolRegistry({ now: FIXED_NOW });
    const routes = adaptRouteRegistry({ now: FIXED_NOW });
    const beforeDecision = JSON.stringify(decision);
    const beforeBudget = JSON.stringify(budget);
    const beforeFeatures = JSON.stringify(features);

    resolveDecision(
      { decision, budget, features, tools, routes },
      { now: FIXED_NOW },
    );

    expect(JSON.stringify(decision)).toBe(beforeDecision);
    expect(JSON.stringify(budget)).toBe(beforeBudget);
    expect(JSON.stringify(features)).toBe(beforeFeatures);
  });
});
