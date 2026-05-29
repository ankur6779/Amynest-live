import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scoreInterventionImpact,
  emptyOutcomeMetrics,
  buildStrategyProfile,
  buildRealityDashboard,
  answerAmyEvidenceQuestion,
  validateExperiment,
  recordRecommendationDispatched,
  validateIntervention,
} from "./index.js";
import { shouldSuppressIntervention } from "./ranking.js";
import type { InterventionLedgerEntry } from "./types.js";

describe("reality-validation scorecard", () => {
  it("marks reading improvement as success", () => {
    const baseline = { ...emptyOutcomeMetrics(), learningSuccess7d: 30, routineCompletionRate7d: 50 };
    const followUp = { ...emptyOutcomeMetrics(), learningSuccess7d: 50, routineCompletionRate7d: 52 };
    const result = scoreInterventionImpact(baseline, followUp, "reading_challenge");
    assert.equal(result.scorecard, "success");
    assert.ok(result.confidence > 0.4);
  });

  it("marks negative routine delta as negative_impact", () => {
    const baseline = { ...emptyOutcomeMetrics(), routineCompletionRate7d: 70 };
    const followUp = { ...emptyOutcomeMetrics(), routineCompletionRate7d: 50 };
    const result = scoreInterventionImpact(baseline, followUp, "routine_playbook");
    assert.equal(result.scorecard, "negative_impact");
  });
});

describe("reality-validation strategy profile", () => {
  it("ranks effective interventions and builds dashboard", () => {
    const entry: InterventionLedgerEntry = validateIntervention({
      ledgerId: "rv_test_1",
      userId: "u1",
      childId: 1,
      interventionId: "reading_7d",
      interventionType: "reading_challenge",
      surface: "parent_hub",
      recommendationTitle: "Reading challenge",
      recommendationKey: "reading_challenge",
      dispatchedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      actionAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      baselineSignals: { routineCompletionRate7d: 0.5, lessonsCompleted7d: 2, currentStreakDays: 1 },
      followUpSignals: { routineCompletionRate7d: 0.55, lessonsCompleted7d: 5, currentStreakDays: 3 },
    });

    const profile = buildStrategyProfile("u1", [entry], {
      routineCompletionRate7d: 55,
      learningSuccess7d: 45,
      accountAgeDays: 90,
      childCount: 1,
    });
    assert.ok(profile.effectiveInterventions.length >= 1);
    assert.ok(profile.globalBenchmarks.routinePercentile >= 0);

    const dashboard = buildRealityDashboard([entry], profile);
    assert.equal(dashboard.interventionsWorked, 1);
    assert.equal(dashboard.recommendationsMade, 1);
  });
});

describe("reality-validation amy evidence", () => {
  it("answers why reading challenges with evidence", () => {
    const pending = recordRecommendationDispatched({
      ledgerId: "rv_p",
      userId: "u1",
      childId: 1,
      interventionId: "r1",
      interventionType: "reading",
      surface: "amy_ai",
      recommendationTitle: "Reading challenge",
      recommendationKey: "reading_challenge",
      dispatchedAt: new Date().toISOString(),
      actionAt: null,
      baselineSignals: { lessonsCompleted7d: 1 },
    });
    const validated = validateIntervention({
      ledgerId: pending.ledgerId,
      userId: pending.userId,
      childId: pending.childId,
      interventionId: pending.interventionId,
      interventionType: pending.interventionType,
      surface: pending.surface,
      recommendationTitle: pending.recommendationTitle,
      recommendationKey: pending.recommendationKey,
      dispatchedAt: pending.dispatchedAt,
      actionAt: pending.actionAt,
      baselineSignals: { lessonsCompleted7d: 1, routineCompletionRate7d: 0.5 },
      followUpSignals: { lessonsCompleted7d: 4, routineCompletionRate7d: 0.55 },
    });
    const answer = answerAmyEvidenceQuestion(
      "Why do you keep recommending reading challenges?",
      [validated],
    );
    assert.match(answer.answer, /recommend|validated|gathering/i);
    assert.ok(answer.evidence.length >= 1);
  });
});

describe("reality-validation experiments", () => {
  it("detects treatment uplift", () => {
    const result = validateExperiment(
      { experimentId: "exp1", variant: "control", sent: 50, outcomes: 10, attributedOutcomes: 5 },
      { experimentId: "exp1", variant: "treatment", sent: 50, outcomes: 15, attributedOutcomes: 10 },
    );
    assert.equal(result.recommendation, "continue_treatment");
    assert.ok(result.upliftPct > 0);
  });
});

describe("reality-validation self-correction", () => {
  it("suppresses repeatedly failed interventions", () => {
    const profile = buildStrategyProfile("u1", [], {
      routineCompletionRate7d: 50,
      learningSuccess7d: 40,
      accountAgeDays: 60,
      childCount: 1,
    });
    profile.ineffectiveInterventions = [
      { key: "bad_playbook", title: "Bad", failureCount: 4, lastFailedAt: new Date().toISOString() },
    ];
    profile.selfCorrectionRules = [
      {
        interventionKey: "bad_playbook",
        suppressUntil: new Date(Date.now() + 86400000).toISOString(),
        reason: "failures",
      },
    ];
    assert.equal(shouldSuppressIntervention("bad_playbook", profile), true);
    assert.equal(shouldSuppressIntervention("good_playbook", profile), false);
  });
});
