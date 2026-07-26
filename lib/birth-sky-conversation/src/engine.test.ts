import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptiveSnapshot,
} from "@workspace/birth-sky-adaptive";
import {
  DEVELOPMENT_ENGINE_VERSION,
  type DevelopmentSnapshot,
} from "@workspace/birth-sky-development";
import {
  MEANING_ENGINE_VERSION,
  type MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import {
  CONVERSATION_ENGINE_VERSION,
  CORE_SAFETY_FLAGS,
  classifyIntent,
  computeConversationPlan,
} from "./index.js";

function sampleMeaning(): MeaningSnapshot {
  return {
    meaningEngineVersion: MEANING_ENGINE_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      learningStyle: ["practical learning"],
      communicationStyle: ["verbal"],
      creativeStrength: ["self-expression"],
      attentionPattern: ["fast-paced"],
      emotionalProfile: ["emotional attunement"],
      socialProfile: ["helpful"],
      strengths: ["confidence", "curiosity"],
      comfortNeeds: ["predictable routines"],
      motivationStyle: ["visibility"],
      curiosityPattern: ["curiosity"],
    },
    parentingGuidance: [],
    conflicts: [],
    categories: {
      strengths: [],
      learningStyle: [],
      communicationStyle: [],
      socialStyle: [],
      comfortNeeds: [],
      motivationStyle: [],
      creativeStyle: [],
      emotionalPattern: [],
      attentionPattern: [],
      curiosityPattern: [],
    },
  };
}

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
    developmentProfile: {} as DevelopmentSnapshot["developmentProfile"],
    priorityAreas: [
      {
        id: "attention",
        domain: "attention",
        label: "Attention",
        rank: 1,
        score: 0.7,
        reason: "test",
      },
    ],
    recommendedActivities: [],
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
      topPriorities: ["Attention", "Learning style"],
      recommendedParentActions: [],
      avoidPatterns: [],
    },
  };
}

function sampleAdaptive(
  overrides?: Partial<AdaptiveSnapshot["profile"]>,
): AdaptiveSnapshot {
  return {
    adaptiveEngineVersion: ADAPTIVE_ENGINE_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    engagementProfile: {
      level: "medium",
      score: 0.55,
      recommendedSessionLengthMinutes: 12,
      preferredActivityTiming: "morning",
      consistencyScore: 0.6,
    },
    routineHealth: {
      completionRate: 0.6,
      dropOffPoints: [],
      missedStreaks: 0,
      successfulStreaks: 1,
      recommendations: [],
    },
    learningPreferences: {
      preferredActivities: ["reading", "focus"],
      completedActivities: ["reading"],
      repeatedInterests: ["reading"],
      avoidedActivities: ["marathon_tasks"],
      engagementTrend: "stable",
    },
    adaptationRecommendations: [],
    confidence: 0.7,
    historySummary: {
      totalCompletions: 4,
      totalSkips: 1,
      sessionsPerWeek: 3,
      feedbackSignals: [],
      achievementTypes: [],
    },
    profile: {
      engagementLevel: "medium",
      preferredActivityTypes: ["reading", "focus"],
      recommendedSessionLengthMinutes: 12,
      routineHealthLabel: "steady",
      adaptationPriority: "continue:reading",
      consistencyScore: 0.6,
      ...overrides,
    },
  };
}

describe("ConversationEngine", () => {
  it("classifies intents deterministically", () => {
    assert.equal(
      classifyIntent({ userQuestion: "How can I help with bedtime sleep?" }).intent,
      "sleep_guidance",
    );
    assert.equal(
      classifyIntent({ userQuestion: "Tips for homework focus and learning" }).intent,
      "learning_guidance",
    );
    assert.equal(
      classifyIntent({
        userQuestion: "What does the Moon say?",
        entryPoint: "sky",
      }).intent,
      "astrology_insight",
    );
    assert.equal(
      classifyIntent({ userQuestion: "Big feelings and meltdown tonight" }).intent,
      "emotional_support",
    );
  });

  it("versions conversation plans", () => {
    const plan = computeConversationPlan({
      userQuestion: "How do I support learning?",
      meaning: sampleMeaning(),
      development: sampleDevelopment(),
      adaptive: sampleAdaptive(),
    });
    assert.equal(plan.conversationEngineVersion, CONVERSATION_ENGINE_VERSION);
    assert.equal(plan.intent, "learning_guidance");
  });

  it("ranks priority topics and depth", () => {
    const plan = computeConversationPlan({
      userQuestion: "Help with focus and learning habits",
      meaning: sampleMeaning(),
      development: sampleDevelopment(),
      adaptive: sampleAdaptive({ engagementLevel: "high" }),
    });
    assert.ok(plan.priorityTopics.includes("attention"));
    assert.ok(["medium", "deep"].includes(plan.recommendedDepth));
    assert.ok(plan.recommendedOrder[0] === "name_sky_anchors");
  });

  it("orders conversation steps and selects tone", () => {
    const plan = computeConversationPlan({
      userQuestion: "Our morning routine is falling apart",
      meaning: sampleMeaning(),
      development: sampleDevelopment(),
      adaptive: sampleAdaptive(),
    });
    assert.equal(plan.intent, "routine_help");
    assert.equal(plan.recommendedTone, "practical");
    assert.ok(plan.recommendedOrder.includes("one_parent_move"));
  });

  it("includes core safety flags always", () => {
    const plan = computeConversationPlan({
      userQuestion: "Will they become a doctor?",
      meaning: sampleMeaning(),
    });
    for (const flag of CORE_SAFETY_FLAGS) {
      assert.ok(plan.safetyFlags.includes(flag), flag);
    }
    assert.ok(plan.avoidTopics.includes("fatalistic_prediction"));
    assert.ok(plan.avoidTopics.includes("medical_diagnosis"));
  });

  it("uses brief depth for low engagement", () => {
    const plan = computeConversationPlan({
      userQuestion: "How can I support learning?",
      development: sampleDevelopment(),
      adaptive: sampleAdaptive({ engagementLevel: "low" }),
    });
    assert.equal(plan.recommendedDepth, "brief");
    assert.ok(plan.priorityTopics.includes("short_session"));
  });

  it("is deterministic for the same input", () => {
    const input = {
      userQuestion: "Emotional support for evening meltdowns",
      entryPoint: "reflect",
      meaning: sampleMeaning(),
      development: sampleDevelopment(),
      adaptive: sampleAdaptive(),
      historySummary: {
        turnCount: 1,
        coveredTopics: ["curiosity"],
        recentIntents: ["general_conversation" as const],
      },
    };
    const a = computeConversationPlan(input);
    const b = computeConversationPlan(input);
    assert.deepEqual(a.profile, b.profile);
    assert.deepEqual(a.priorityTopics, b.priorityTopics);
    assert.deepEqual(a.avoidTopics, b.avoidTopics);
    assert.deepEqual(a.recommendedOrder, b.recommendedOrder);
    assert.equal(a.intent, b.intent);
  });

  it("returns existing plan when version matches (compat)", () => {
    const first = computeConversationPlan({
      userQuestion: "Sleep tips please",
      meaning: sampleMeaning(),
    });
    const second = computeConversationPlan({
      userQuestion: "Totally different learning question",
      meaning: sampleMeaning(),
      conversationPlan: first,
    });
    assert.equal(second.intent, first.intent);
    assert.deepEqual(second.profile, first.profile);
  });
});
