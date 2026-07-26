import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptiveSnapshot,
} from "@workspace/birth-sky-adaptive";
import {
  CONVERSATION_ENGINE_VERSION,
  computeConversationPlan,
} from "@workspace/birth-sky-conversation";
import {
  DEVELOPMENT_ENGINE_VERSION,
  computeDevelopmentSnapshot,
} from "@workspace/birth-sky-development";
import {
  MEANING_ENGINE_VERSION,
  computeMeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import {
  EVIDENCE_ENGINE_VERSION,
  computeEvidenceSnapshot,
  shouldIncludeEvidenceInAiContext,
  stableRuleCode,
} from "./index.js";

describe("ExplainabilityEngine", () => {
  const astronomy = {
    sunSign: "Leo",
    moonSign: "Cancer",
    risingSign: "Virgo",
    planetHouseMap: { sun: 5, moon: 4 },
  };

  const meaning = computeMeaningSnapshot(astronomy);
  const development = computeDevelopmentSnapshot({
    meaning,
    ageMonths: 72,
    parentGoals: ["better_focus"],
  });
  const adaptive = {
    adaptiveEngineVersion: ADAPTIVE_ENGINE_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    engagementProfile: {
      level: "high" as const,
      score: 0.8,
      recommendedSessionLengthMinutes: 18,
      preferredActivityTiming: "morning" as const,
      consistencyScore: 0.7,
    },
    routineHealth: {
      completionRate: 0.8,
      dropOffPoints: [],
      missedStreaks: 0,
      successfulStreaks: 2,
      recommendations: [
        { kind: "focus", action: "increase" as const, reason: "high_completion" },
      ],
    },
    learningPreferences: {
      preferredActivities: ["focus", "reading"],
      completedActivities: ["focus"],
      repeatedInterests: ["focus"],
      avoidedActivities: [],
      engagementTrend: "rising" as const,
    },
    adaptationRecommendations: [
      {
        id: "routine_focus_increase",
        action: "increase" as const,
        priority: 1,
        target: "focus",
        reason: "high_completion",
      },
    ],
    confidence: 0.8,
    historySummary: {
      totalCompletions: 10,
      totalSkips: 1,
      sessionsPerWeek: 5,
      feedbackSignals: [],
      achievementTypes: [],
    },
    profile: {
      engagementLevel: "high" as const,
      preferredActivityTypes: ["focus", "reading"],
      recommendedSessionLengthMinutes: 18,
      routineHealthLabel: "strong",
      adaptationPriority: "increase:focus",
      consistencyScore: 0.7,
    },
  } satisfies AdaptiveSnapshot;

  const conversation = computeConversationPlan({
    meaning,
    development,
    adaptive,
    userQuestion: "How can I support learning and focus?",
    entryPoint: "sky",
  });

  it("versions evidence snapshots", () => {
    const snap = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
    });
    assert.equal(snap.evidenceEngineVersion, EVIDENCE_ENGINE_VERSION);
    assert.equal(snap.engineVersions.meaning, MEANING_ENGINE_VERSION);
    assert.equal(snap.engineVersions.development, DEVELOPMENT_ENGINE_VERSION);
    assert.equal(snap.engineVersions.adaptive, ADAPTIVE_ENGINE_VERSION);
    assert.equal(snap.engineVersions.conversation, CONVERSATION_ENGINE_VERSION);
  });

  it("traces every semantic output with rule ids", () => {
    const snap = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
    });
    assert.ok(snap.ruleTrace.length > 0);
    for (const n of snap.ruleTrace) {
      assert.ok(n.rules.length > 0, `missing rules for ${n.id}`);
      for (const r of n.rules) {
        assert.match(r.id, /^[MDAC]-\d{3}$/);
        assert.ok(r.key.length > 0);
      }
      assert.ok(typeof n.confidence === "number");
      assert.ok(Array.isArray(n.supportingFacts));
      assert.ok(Array.isArray(n.dependencies));
    }
    assert.ok(snap.ruleTrace.some((n) => n.engine === "meaning"));
    assert.ok(snap.ruleTrace.some((n) => n.engine === "development"));
    assert.ok(snap.ruleTrace.some((n) => n.engine === "adaptive"));
    assert.ok(snap.ruleTrace.some((n) => n.engine === "conversation"));
  });

  it("builds a dependency graph across engines", () => {
    const snap = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
    });
    assert.ok(snap.dependencyGraph.nodes.length > 0);
    assert.ok(snap.dependencyGraph.edges.length > 0);
    assert.ok(
      snap.dependencyGraph.edges.some((e) => e.relation === "derives"),
    );
    assert.ok(
      snap.dependencyGraph.edges.some((e) => e.relation === "prioritizes"),
    );
  });

  it("produces stable ordering and deterministic output", () => {
    const a = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
      level: "debug",
    });
    const b = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
      level: "debug",
    });
    assert.deepEqual(
      a.ruleTrace.map((n) => n.id),
      b.ruleTrace.map((n) => n.id),
    );
    assert.deepEqual(a.dependencyGraph, b.dependencyGraph);
    assert.deepEqual(a.confidenceBreakdown, b.confidenceBreakdown);
    assert.deepEqual(a.views.compact, b.views.compact);
  });

  it("stable rule codes are deterministic", () => {
    assert.equal(
      stableRuleCode("M", "sun_sign_Leo"),
      stableRuleCode("M", "sun_sign_Leo"),
    );
    assert.notEqual(
      stableRuleCode("M", "sun_sign_Leo"),
      stableRuleCode("M", "moon_sign_Cancer"),
    );
  });

  it("gates AI inclusion behind DEBUG_EXPLAINABILITY", () => {
    assert.equal(shouldIncludeEvidenceInAiContext({ env: {} }), false);
    assert.equal(
      shouldIncludeEvidenceInAiContext({
        env: { DEBUG_EXPLAINABILITY: "true" },
      }),
      true,
    );
    assert.equal(
      shouldIncludeEvidenceInAiContext({ flag: true, env: {} }),
      true,
    );
    assert.equal(
      shouldIncludeEvidenceInAiContext({
        flag: false,
        env: { DEBUG_EXPLAINABILITY: "true" },
      }),
      false,
    );
  });

  it("returns existing snapshot when version matches (compat)", () => {
    const first = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
    });
    const second = computeEvidenceSnapshot({
      astronomy: { sunSign: "Aries" },
      meaning,
      evidenceSnapshot: first,
    });
    assert.deepEqual(
      second.ruleTrace.map((n) => n.id),
      first.ruleTrace.map((n) => n.id),
    );
  });

  it("exposes compact/debug/developer views without parent prose", () => {
    const snap = computeEvidenceSnapshot({
      astronomy,
      meaning,
      development,
      adaptive,
      conversation,
      level: "developer",
    });
    assert.ok(snap.views.compact.length > 0);
    assert.ok(snap.views.debug.some((l) => l.startsWith("trace ")));
    assert.ok(snap.views.developer.some((l) => l.includes("evidence_engine=")));
    const blob = JSON.stringify(snap.views);
    assert.equal(blob.includes("Your child will"), false);
  });
});
