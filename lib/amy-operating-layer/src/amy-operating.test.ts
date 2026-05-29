import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { computeFamilyIntelligence } from "@workspace/family-intelligence";
import type { FamilyIntelligenceInput } from "@workspace/family-intelligence";
import {
  buildAmyOperatingContext,
  answerNaturalLanguageCommand,
  buildHubDashboardView,
  AMY_OPERATING_ENGINE_VERSION,
} from "./index.js";

function baseInput(overrides: Partial<FamilyIntelligenceInput> = {}): FamilyIntelligenceInput {
  return {
    userId: "u1",
    primaryChildId: 1,
    childName: "Ava",
    timezone: "America/New_York",
    localDate: "2026-05-29",
    isPremium: false,
    routineCompletionRate7d: 0.65,
    weeklyRoutineConsistency: 0.6,
    lessonsCompleted7d: 3,
    lessonsCompletedTotal: 15,
    weakSubjects: ["math"],
    strongSubjects: ["english"],
    currentStreakDays: 5,
    streakBrokenDaysAgo: null,
    daysSinceLastActive: 1,
    notificationsOpened7d: 3,
    sessionsLast7d: 5,
    accountAgeDays: 21,
    churnRisk7d: 0.15,
    churnRisk30d: 0.12,
    sleepQualityAvg7d: 3.5,
    screenMinutesAvg7d: 45,
    completionPctAvg7d: 70,
    parentGoals: ["improve_focus"],
    trustScore: 72,
    dropOffRisk: 0.2,
    healthHistory7d: [62, 65, 68],
    healthHistory30d: [55, 60, 62],
    activeGoals: [],
    recentMemory: [],
    ...overrides,
  };
}

test("Amy operating context includes all capabilities", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.equal(ctx.engineVersion, AMY_OPERATING_ENGINE_VERSION);
  assert.ok(ctx.capabilities.length >= 6);
  assert.ok(ctx.dailyBriefing.wins.length >= 0);
  assert.ok(ctx.systemPromptBlock.includes("AMY FAMILY OPERATING CONTEXT"));
});

test("daily briefing includes suggested questions", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.ok(ctx.dailyBriefing.suggestedQuestions.includes("How are we doing?"));
});

test("weekly review has executive summary", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.ok(ctx.weeklyReview.executiveSummary.includes("Ava"));
});

test("NL command answers how are we doing", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const result = answerNaturalLanguageCommand("How are we doing?", snapshot);
  assert.ok(result.answer.includes("health"));
  assert.equal(result.confidence, "observation");
});

test("NL command answers biggest risk", () => {
  const snapshot = computeFamilyIntelligence(baseInput({ routineCompletionRate7d: 0.2 }));
  const result = answerNaturalLanguageCommand("What's the biggest risk right now?", snapshot);
  assert.ok(result.answer.toLowerCase().includes("risk"));
  assert.equal(result.confidence, "prediction");
});

test("explainability includes why on recommendations", () => {
  const snapshot = computeFamilyIntelligence(baseInput({ routineCompletionRate7d: 0.25 }));
  const ctx = buildAmyOperatingContext(snapshot);
  const rec = ctx.dailyBriefing.recommendedActions[0];
  if (rec) {
    assert.ok(rec.why.length > 10);
    assert.ok(["observation", "prediction", "high_confidence_prediction"].includes(rec.confidence));
  }
});

test("knowledge graph has nodes and edges", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.ok(ctx.knowledgeGraph.nodes.length >= 1);
  assert.ok(ctx.knowledgeGraph.edges.length >= 0);
});

test("executive mode includes narration", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.ok(ctx.executiveMode.narration.length > 20);
  assert.ok(ctx.executiveMode.predictions.length >= 2);
});

test("proactive messages avoid guilt patterns", () => {
  const snapshot = computeFamilyIntelligence(baseInput({ churnRisk7d: 0.7, daysSinceLastActive: 5 }));
  const ctx = buildAmyOperatingContext(snapshot);
  for (const m of ctx.proactiveMessages) {
    assert.ok(!/\byou failed\b/i.test(m.body));
  }
});

test("system prompt includes trust guidelines", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  assert.ok(ctx.systemPromptBlock.includes("TRUST & SAFETY"));
});

test("hub dashboard view exposes single primary action with why", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const ctx = buildAmyOperatingContext(snapshot);
  const hub = buildHubDashboardView(ctx);
  assert.ok(hub.healthScore >= 0 && hub.healthScore <= 100);
  assert.ok(hub.amyRecommendation.why.length > 5);
  if (hub.primaryAction) {
    assert.ok(hub.primaryAction.why.length > 5);
  }
  assert.ok(hub.weeklyWins.length >= 0);
  assert.ok(hub.timelineHighlights.length <= 5);
});
