import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEVELOPMENT_ENGINE_VERSION,
  type DevelopmentSnapshot,
} from "@workspace/birth-sky-development";
import {
  ADAPTIVE_ENGINE_VERSION,
  assertNoIdentifiers,
  computeAdaptiveSnapshot,
  buildRoutineHealth,
  accumulateFeedbackWeights,
} from "./index.js";

function sampleDevelopment(): DevelopmentSnapshot {
  return {
    developmentEngineVersion: DEVELOPMENT_ENGINE_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    stage: {
      id: "school_5_8",
      label: "5–8 years",
      ageMonthsMin: 60,
      ageMonthsMax: 95,
      capabilities: ["structured learning readiness"],
    },
    ageMonths: 72,
    developmentProfile: {
      emotionalRegulation: {
        domain: "emotionalRegulation",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      communication: {
        domain: "communication",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      socialInteraction: {
        domain: "socialInteraction",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      learningStyle: {
        domain: "learningStyle",
        score: 0.55,
        labels: ["practical learning"],
        confidence: 0.6,
      },
      attention: {
        domain: "attention",
        score: 0.45,
        labels: [],
        confidence: 0.6,
      },
      creativity: {
        domain: "creativity",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      motorDevelopment: {
        domain: "motorDevelopment",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      sleepTendencies: {
        domain: "sleepTendencies",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      routineAdaptability: {
        domain: "routineAdaptability",
        score: 0.5,
        labels: [],
        confidence: 0.6,
      },
      curiosity: {
        domain: "curiosity",
        score: 0.6,
        labels: ["curiosity"],
        confidence: 0.6,
      },
      confidence: {
        domain: "confidence",
        score: 0.55,
        labels: [],
        confidence: 0.6,
      },
    },
    priorityAreas: [],
    recommendedActivities: [
      {
        id: "focus_timer",
        label: "Short focus timer block",
        domain: "attention",
        priority: 1,
      },
      {
        id: "reading_together",
        label: "Shared reading habit",
        domain: "learningStyle",
        priority: 1,
      },
    ],
    recommendedParentActions: [],
    avoidPatterns: [],
    routineAlignment: {
      strengths: [],
      missingOpportunities: [],
      suggestedImprovements: [],
      priorityRanking: [],
    },
    confidence: 0.7,
    profile: {
      developmentStage: "5–8 years",
      learningProfile: ["practical learning"],
      emotionalProfile: [],
      topPriorities: ["Attention"],
      recommendedParentActions: [],
      avoidPatterns: [],
    },
  };
}

describe("AdaptiveEngine", () => {
  it("versions adaptive snapshots", () => {
    const snap = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
      history: null,
    });
    assert.equal(snap.adaptiveEngineVersion, ADAPTIVE_ENGINE_VERSION);
  });

  it("scores engagement from session frequency and completions", () => {
    const snap = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
      history: {
        sessionFrequency: { sessionsPerWeek: 6, avgSessionMinutes: 20 },
        completedRoutines: [
          { kind: "focus", count: 8, lastDayPart: "morning" },
          { kind: "reading", count: 5, lastDayPart: "evening" },
        ],
        skippedRoutines: [{ kind: "focus", count: 1 }],
        activities: [
          { type: "focus", completed: 8, skipped: 1, repeated: 3 },
          { type: "reading", completed: 5, repeated: 2 },
        ],
      },
    });
    assert.equal(snap.engagementProfile.level, "high");
    assert.ok(snap.engagementProfile.recommendedSessionLengthMinutes >= 8);
    assert.equal(snap.engagementProfile.preferredActivityTiming, "morning");
    assert.ok(snap.profile.preferredActivityTypes.includes("focus"));
  });

  it("adapts routines with reduce/increase/rotate actions", () => {
    const health = buildRoutineHealth({
      completedRoutines: [{ kind: "sleep", count: 10 }],
      skippedRoutines: [
        { kind: "focus", count: 6, dropOffStep: "focus_block" },
        { kind: "outdoor", count: 1 },
      ],
    });
    assert.ok(health.completionRate < 1);
    assert.ok(health.dropOffPoints.includes("focus_block"));
    const focus = health.recommendations.find((r) => r.kind === "focus");
    assert.ok(focus);
    assert.equal(focus!.action, "reduce");
    const sleep = health.recommendations.find((r) => r.kind === "sleep");
    assert.ok(sleep);
    assert.equal(sleep!.action, "increase");
  });

  it("weights parent feedback into adaptation", () => {
    const weights = accumulateFeedbackWeights([
      { signal: "too_difficult", targetType: "focus", count: 2 },
      { signal: "child_enjoyed", targetType: "reading", count: 3 },
    ]);
    assert.ok(weights.difficulty < 0);
    assert.ok(weights.enjoyment > 0);
    assert.ok((weights.byType.get("focus")?.difficulty ?? 0) < 0);

    const snap = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
      history: {
        completedRoutines: [{ kind: "focus", count: 2 }],
        skippedRoutines: [{ kind: "focus", count: 1 }],
        parentFeedback: [
          { signal: "too_difficult", targetType: "focus", count: 2 },
          { signal: "child_enjoyed", targetType: "reading", count: 2 },
        ],
        activities: [
          { type: "focus", completed: 2, skipped: 1 },
          { type: "reading", completed: 4, repeated: 2 },
        ],
      },
    });
    assert.ok(snap.learningPreferences.preferredActivities.includes("reading"));
    assert.ok(
      snap.adaptationRecommendations.some(
        (r) => r.target === "focus" && (r.action === "reduce" || r.action === "rotate"),
      ),
    );
  });

  it("rejects history containing personal identifiers", () => {
    assert.throws(
      () => assertNoIdentifiers({ userId: "u_1", completedRoutines: [] }),
      /adaptive_privacy_violation/,
    );
  });

  it("is deterministic for the same adaptive input", () => {
    const input = {
      development: sampleDevelopment(),
      history: {
        sessionFrequency: { sessionsPerWeek: 3, avgSessionMinutes: 12 },
        completedRoutines: [
          { kind: "play", count: 4, lastDayPart: "afternoon" },
        ],
        skippedRoutines: [{ kind: "focus", count: 2, dropOffStep: "intro" }],
        achievements: [{ type: "streak_3", count: 1 }],
        parentFeedback: [{ signal: "helpful", count: 1 }],
        activities: [
          { type: "play", completed: 4, repeated: 2 },
          { type: "focus", completed: 1, skipped: 2 },
        ],
      },
    };
    const a = computeAdaptiveSnapshot(input);
    const b = computeAdaptiveSnapshot(input);
    assert.deepEqual(a.profile, b.profile);
    assert.deepEqual(a.engagementProfile, b.engagementProfile);
    assert.deepEqual(a.routineHealth, b.routineHealth);
    assert.deepEqual(a.learningPreferences, b.learningPreferences);
    assert.deepEqual(a.adaptationRecommendations, b.adaptationRecommendations);
  });

  it("returns existing snapshot when version matches (compat)", () => {
    const first = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
      history: {
        sessionFrequency: { sessionsPerWeek: 1 },
        activities: [{ type: "sleep", completed: 1 }],
      },
    });
    const second = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
      history: {
        sessionFrequency: { sessionsPerWeek: 10 },
        activities: [{ type: "focus", completed: 20 }],
      },
      adaptiveSnapshot: first,
    });
    assert.deepEqual(second.profile, first.profile);
  });

  it("works with empty history using development seeds", () => {
    const snap = computeAdaptiveSnapshot({
      development: sampleDevelopment(),
    });
    assert.equal(snap.engagementProfile.level, "medium");
    assert.ok(snap.profile.preferredActivityTypes.length > 0);
    assert.ok(snap.confidence > 0 && snap.confidence <= 1);
  });
});
