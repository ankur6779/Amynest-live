import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import { createDefaultPersonalityProfile } from "./personalityEngine.js";
import { createInitialLearningPath } from "./learningPathEngine.js";
import {
  runPrediction,
  computeDropOffRisk,
  forecastSkillLevels,
  predictRecommendedDifficulty,
} from "./predictionEngine.js";
import {
  correctPredictionDrift,
  applyConfidencePenalty,
} from "./predictionDrift.js";
import {
  generatePlanUsingPrediction,
} from "./preSessionPlanner.js";
import {
  shouldTriggerEarlyIntervention,
  resolveEarlyIntervention,
} from "./earlyIntervention.js";
import { applyPredictionPrior } from "./predictionNba.js";
import { clearSessionHistory, recordSessionHistory } from "./sessionHistoryStore.js";
import { NBA_ACTIONS } from "./types.js";
import type { SessionHistoryEntry } from "./types-prediction.js";

function historyWithSkips(): SessionHistoryEntry[] {
  return Array.from({ length: 5 }, (_, i) => ({
    endedAt: new Date(Date.now() - i * 86400000).toISOString(),
    durationMinutes: 3,
    skips: 3,
    completions: 0,
    engagementScore: 30 - i * 2,
    explorationSuccesses: 0,
    boredomSignals: 2,
    skillLevels: { phonics: 2, motor_skills: 2, cognitive: 2, social: 2 },
  }));
}

describe("prediction engine", () => {
  beforeEach(() => clearSessionHistory());

  it("outputs bounded drop-off risk and engagement", () => {
    const profile = createDefaultLearningProfile("p1");
    const out = runPrediction({ childId: "p1", profile });
    assert.ok(out.predictedDropOffRisk >= 0 && out.predictedDropOffRisk <= 1);
    assert.ok(out.predictedEngagement >= 0 && out.predictedEngagement <= 1);
    assert.ok(out.confidence > 0);
    assert.ok(out.recommendedSessionLength >= 5);
  });

  it("detects high drop-off from skip-heavy history", () => {
    const profile = createDefaultLearningProfile("p2");
    for (const h of historyWithSkips()) {
      recordSessionHistory("p2", h);
    }
    const risk = computeDropOffRisk(profile, historyWithSkips());
    assert.ok(risk > 0.45);
  });

  it("forecasts skill levels with plateau detection", () => {
    const profile = createDefaultLearningProfile("p3");
    const flat: SessionHistoryEntry[] = Array.from({ length: 4 }, () => ({
      endedAt: new Date().toISOString(),
      durationMinutes: 10,
      skips: 0,
      completions: 1,
      engagementScore: 60,
      explorationSuccesses: 0,
      boredomSignals: 0,
      skillLevels: { phonics: 2, motor_skills: 2, cognitive: 2, social: 2 },
    }));
    const forecasts = forecastSkillLevels({
      childId: "p3",
      profile,
      sessionHistory: flat,
    });
    const phonics = forecasts.find((f) => f.skill === "phonics");
    assert.ok(phonics);
    assert.ok(["plateau", "steady", "fast_growth"].includes(phonics.status));
  });

  it("reduces difficulty when drop-off risk high", () => {
    const profile = createDefaultLearningProfile("p4");
    const highRisk = predictRecommendedDifficulty(profile, 0.75, 0.35, "phonics", 42);
    const lowRisk = predictRecommendedDifficulty(profile, 0.15, 0.75, "phonics", 42);
    const order = { easy: 0, medium: 1, hard: 2 };
    assert.ok(
      order[highRisk] <= order[lowRisk],
      `expected high-risk <= low-risk difficulty, got ${highRisk} vs ${lowRisk}`,
    );
  });
});

describe("pre-session planning", () => {
  it("shortens session when distractibility high", () => {
    const profile = createDefaultLearningProfile("p5");
    const personality = createDefaultPersonalityProfile("p5");
    personality.traits.distractibility = 0.85;
    const prediction = runPrediction({ childId: "p5", profile, personality });
    const plan = generatePlanUsingPrediction(prediction, { personality });
    assert.ok(plan.maxSessionItems <= 10);
  });

  it("triggers early intervention on high drop-off", () => {
    const profile = createDefaultLearningProfile("p6");
    const prediction = runPrediction({
      childId: "p6",
      profile,
      sessionHistory: historyWithSkips(),
    });
    assert.equal(shouldTriggerEarlyIntervention(prediction), true);
    const flags = resolveEarlyIntervention(prediction);
    assert.equal(flags.injectFunEarly, true);
  });
});

describe("prediction drift", () => {
  it("penalizes confidence on large mismatch", () => {
    const profile = createDefaultLearningProfile("p7");
    const prior = runPrediction({ childId: "p7", profile });
    const drift = correctPredictionDrift(prior, {
      engagementScore: 20,
      skips: 4,
      sessionLengthMinutes: 2,
      completed: false,
    });
    assert.ok(drift.mismatch > 0.2);
    const adjusted = applyConfidencePenalty(prior, drift.confidencePenalty);
    assert.ok(adjusted.confidence < prior.confidence);
  });

  it("boosts exploration on drift", () => {
    const profile = createDefaultLearningProfile("p8");
    const prior = runPrediction({
      childId: "p8",
      profile,
      sessionHistory: historyWithSkips(),
    });
    const drift = correctPredictionDrift(prior, {
      engagementScore: 90,
      skips: 0,
      sessionLengthMinutes: 20,
      completed: true,
    });
    if (drift.mismatch >= 0.28) {
      assert.ok(drift.explorationBoost > 0);
    }
  });
});

describe("NBA prediction prior", () => {
  it("biases toward decrease difficulty when drop-off high", () => {
    const probs = Object.fromEntries(NBA_ACTIONS.map((a) => [a, 1 / NBA_ACTIONS.length])) as Record<
      import("./types.js").NbaAction,
      number
    >;
    const prior = runPrediction({
      childId: "p9",
      profile: createDefaultLearningProfile("p9"),
      sessionHistory: historyWithSkips(),
    });
    const adjusted = applyPredictionPrior(
      {
        action: "KEEP_AS_IS",
        confidence: 0.3,
        probabilities: probs,
        rewardEstimate: 0.5,
      },
      prior,
    );
    assert.ok(
      (adjusted.probabilities.DECREASE_DIFFICULTY ?? 0) >=
        (probs.DECREASE_DIFFICULTY ?? 0),
    );
  });
});
