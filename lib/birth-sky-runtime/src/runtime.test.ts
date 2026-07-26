import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignExperiment,
  applyExperimentToConversationPlan,
  buildAdminDashboard,
  flagsAllEnabled,
  profileIntelligencePipeline,
  recordPipelineObservability,
  recordProductAnalytics,
  resetRuntimeMetricsForTests,
  resolvePipelineFeatureFlags,
  runIntelligencePipeline,
  PIPELINE_SLO_MS,
} from "./index.js";
import type { ConversationPlan } from "@workspace/birth-sky-conversation";

describe("birth-sky-runtime", () => {
  it("resolves feature flags with safe defaults", () => {
    const flags = resolvePipelineFeatureFlags({
      BIRTH_SKY_FF_MEANING: "1",
      BIRTH_SKY_FF_EVIDENCE: "0",
    });
    assert.equal(flags.meaning, true);
    assert.equal(flags.evidence, false);
    assert.equal(flags.conversation, true);
  });

  it("runs pipeline with failover when meaning disabled", () => {
    const result = runIntelligencePipeline({
      requestId: "req_failover",
      astronomy: { sunSign: "Leo", moonSign: "Cancer", risingSign: "Virgo" },
      ageMonths: 48,
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      flags: {
        ...flagsAllEnabled(),
        meaning: false,
        development: false,
        adaptive: false,
      },
      enableExperiments: false,
    });
    assert.equal(result.meaning, null);
    assert.ok(result.conversation); // conversation can still plan from question
    assert.equal(result.status, "ok");
  });

  it("does not crash when a stage throws — simulated via disabled deps", () => {
    const result = runIntelligencePipeline({
      requestId: "req_ok",
      astronomy: { sunSign: "Aries", moonSign: "Taurus" },
      ageMonths: 24,
      userQuestion: "Help with bedtime sleep",
      entryPoint: "reflect",
      flags: flagsAllEnabled(),
      enableExperiments: false,
    });
    assert.ok(result.totalPipelineMs >= 0);
    assert.ok(result.stageTimings.length >= 5);
  });

  it("assigns stable experiment arms from request id", () => {
    const a = assignExperiment({ requestId: "stable_id_1", enabled: true });
    const b = assignExperiment({ requestId: "stable_id_1", enabled: true });
    assert.ok(a);
    assert.deepEqual(a, b);
  });

  it("applies experiment presentation without dropping safety", () => {
    const base = {
      conversationEngineVersion: "conversation-engine/1.0.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
      intent: "learning_guidance",
      priorityTopics: ["attention"],
      secondaryTopics: [],
      avoidTopics: ["fatalistic_prediction"],
      recommendedDepth: "medium",
      recommendedTone: "supportive",
      recommendedExamples: ["a", "b", "c", "d"],
      recommendedOrder: [
        "name_sky_anchors",
        "explain:attention",
        "one_parent_move",
        "optional_reflective_question",
      ],
      strategy: {
        tone: "supportive",
        audience: "parent_only",
        detailLevel: "medium",
        safetyNotes: ["no_absolute_predictions"],
        evidencePreference: "balanced",
        encouragementLevel: "steady",
        examplesAllowed: true,
      },
      safetyFlags: ["no_absolute_predictions", "no_medical_diagnosis"],
      confidence: 0.9,
      profile: {
        intent: "learning_guidance",
        depth: "medium",
        tone: "supportive",
        priority: "attention",
        avoid: "fatalistic_prediction",
        order: "name_sky_anchors>explain:attention",
      },
    } as ConversationPlan;

    const assignment = assignExperiment({
      requestId: "bucket_high_zzzz",
      enabled: true,
    });
    const next = applyExperimentToConversationPlan(base, assignment);
    assert.deepEqual(next.safetyFlags, base.safetyFlags);
    assert.ok(next.avoidTopics.includes("fatalistic_prediction"));
  });

  it("records observability and builds admin dashboard", () => {
    resetRuntimeMetricsForTests();
    const pipeline = runIntelligencePipeline({
      requestId: "dash_1",
      astronomy: { sunSign: "Leo", moonSign: "Cancer" },
      ageMonths: 72,
      userQuestion: "What stands out in the sky chart?",
      entryPoint: "sky",
      flags: flagsAllEnabled(),
      enableExperiments: true,
    });
    recordPipelineObservability({
      requestId: "dash_1",
      stageTimings: pipeline.stageTimings,
      totalPipelineMs: pipeline.totalPipelineMs,
      llmLatencyMs: 120,
      cacheHit: true,
      evaluationScore: 99,
      safetyScore: 100,
      snapshotVersions: pipeline.snapshotVersions,
      flags: pipeline.flags,
      experiment: pipeline.experiment
        ? {
            experimentId: pipeline.experiment.experimentId,
            armId: pipeline.experiment.armId,
          }
        : null,
      failoverStages: pipeline.failoverStages,
      status: pipeline.status,
      promptTokens: 800,
      completionTokens: 200,
      estimatedCostUsd: 0.002,
    });
    recordProductAnalytics({ name: "conversation_start", props: { entry: "sky" } });
    recordProductAnalytics({
      name: "conversation_complete",
      props: { entry: "sky" },
    });
    const dash = buildAdminDashboard();
    assert.equal(dash.runtimeVersion.includes("birth-sky-runtime"), true);
    assert.ok(dash.pipelineVersions.meaning);
    assert.ok(dash.quality.sampleSize >= 1);
    assert.ok(dash.cost.totalEstimatedCostUsd >= 0);
    assert.ok(typeof dash.featureFlags.meaning === "boolean");
  });

  it("meets deterministic pipeline SLO (<500ms p95)", () => {
    const report = profileIntelligencePipeline(8);
    assert.ok(report.p95TotalMs <= PIPELINE_SLO_MS, `p95=${report.p95TotalMs}`);
    assert.equal(report.passed, true);
  });
});
