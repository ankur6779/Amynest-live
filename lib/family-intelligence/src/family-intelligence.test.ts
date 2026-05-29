import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  computeFamilyIntelligence,
  computeHealthScore,
  assessFamilyRisk,
  detectFamilyMoments,
  prioritizeActions,
  buildOrchestrationPlan,
  generateWeeklyReport,
  generatePredictiveInterventions,
  buildCommandCenter,
  FAMILY_INTELLIGENCE_ENGINE_VERSION,
} from "./index.js";
import type { FamilyIntelligenceInput } from "./types.js";

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
    healthHistory30d: [55, 60, 62, 65],
    activeGoals: [],
    recentMemory: [],
    ...overrides,
  };
}

test("family health score is 0-100 with six components", () => {
  const health = computeHealthScore(baseInput());
  assert.ok(health.score >= 0 && health.score <= 100);
  assert.ok(health.components.routineConsistency > 0);
  assert.ok(health.components.learningConsistency > 0);
  assert.ok(health.components.streakHealth > 0);
});

test("risk engine flags routine collapse", () => {
  const risks = assessFamilyRisk(baseInput({ routineCompletionRate7d: 0.2 }));
  assert.ok(risks.routineCollapseRisk >= 0.4);
  assert.equal(risks.primaryRisk, "routine_problem");
});

test("moment detection finds streak milestone", () => {
  const moments = detectFamilyMoments(baseInput({ currentStreakDays: 7 }));
  assert.ok(moments.some((m) => m.type === "consistency_milestone"));
});

test("action prioritizer ranks highest value first", () => {
  const input = baseInput({ routineCompletionRate7d: 0.2, churnRisk30d: 0.2 });
  const risks = assessFamilyRisk(input);
  const actions = prioritizeActions(risks, [], input);
  assert.ok(actions.length > 0);
  assert.ok(actions[0]!.valueScore >= (actions[1]?.valueScore ?? 0));
});

test("orchestration coordinates multiple surfaces", () => {
  const snapshot = computeFamilyIntelligence(baseInput({ currentStreakDays: 7 }));
  assert.ok(snapshot.orchestration.notifications.enabled);
  assert.ok(snapshot.orchestration.parentHub.enabled);
});

test("weekly report includes wins and recommendations", () => {
  const input = baseInput();
  const health = computeHealthScore(input);
  const report = generateWeeklyReport(input, health);
  assert.ok(report.wins.length > 0 || report.recommendations.length > 0);
});

test("predictive interventions fire before churn", () => {
  const interventions = generatePredictiveInterventions(
    baseInput({ churnRisk7d: 0.65, daysSinceLastActive: 4 }),
  );
  assert.ok(interventions.some((i) => i.id === "parent_churn_risk"));
});

test("unified brain produces full snapshot", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  assert.equal(snapshot.engineVersion, FAMILY_INTELLIGENCE_ENGINE_VERSION);
  assert.ok(snapshot.health.score > 0);
  assert.ok(snapshot.digitalTwin.strengths.length >= 0);
  assert.ok(snapshot.successMetrics.overallSuccess > 0);
});

test("command center aggregates all dimensions", () => {
  const snapshot = computeFamilyIntelligence(baseInput());
  const cmd = buildCommandCenter(snapshot);
  assert.ok(cmd.familyHealth.score === snapshot.health.score);
  assert.ok(cmd.risk.breakdown.routine >= 0);
  assert.ok(cmd.recommendedActions.length >= 0);
});

test("orchestration suppresses subscription when premium", () => {
  const snapshot = computeFamilyIntelligence(baseInput({ isPremium: true }));
  assert.equal(snapshot.orchestration.subscriptions.enabled, false);
});
