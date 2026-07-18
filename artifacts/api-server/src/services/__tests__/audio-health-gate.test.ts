import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_GATE_THRESHOLDS,
  evaluateAudioHealthGate,
  evaluateCachePhase,
  evaluateLogAnalysisPhase,
  evaluateQueuePhase,
  evaluateSecurityPhase,
  evaluateStaticPhase,
  evaluateTtsPhase,
  skippedPhase,
} from "../audio-health-gate.js";
import {
  evaluateStaticAudioResponse,
  validateProductionSecrets,
} from "../audio-health-gate-runner.js";

const healthyInput = {
  infraAudioOk: true,
  staticCircuitOpen: false,
  logAnalysis: {
    totalRequests: 1000,
    failureRate: 0.01,
    timeoutRate: 0.005,
  },
  queue: {
    redisReachable: true,
    workerAvailable: true,
    queueMode: "bullmq",
    failedJobs: 2,
    stalledJobs: 0,
    waitingJobs: 1,
    activeJobs: 0,
  },
  tts: {
    generationOk: true,
    playbackUrlValid: true,
    ttfaMs: 800,
    generationLatencyMs: 1200,
    cacheLatencyMs: 200,
    openAiConfigured: true,
    storageOk: true,
  },
  prewarm: {
    warmupSuccessRate: 0.98,
    lockOk: true,
    recentWarmupFailures: 0,
    recentWarmupTotal: 20,
  },
  staticSamples: [
    {
      hash: "abc",
      ok: true,
      status: 200,
      contentLength: 12_000,
      contentType: "audio/mpeg",
    },
  ],
  cache: {
    hitRate: 0.85,
    hitRateVerified: true,
    memoryOk: true,
    redisOk: true,
    gcsOk: true,
    postgresOk: true,
  },
  security: {
    staticMissingPostProtected: true,
    adminDashboardProtected: true,
    adminSystemHealthProtected: true,
    storyStreamRequiresAuth: null,
  },
};

describe("audio-health-gate", () => {
  it("PASS when all probes healthy", () => {
    const report = evaluateAudioHealthGate(healthyInput);
    assert.equal(report.decision, "PASS");
    assert.ok(report.score >= 90);
    assert.equal(report.blockers.length, 0);
    assert.equal(report.phases.length, 9);
  });

  it("FAIL when failure rate exceeds gate", () => {
    const phase = evaluateLogAnalysisPhase({
      totalRequests: 500,
      failureRate: 0.05,
      timeoutRate: 0.002,
    });
    assert.equal(phase.status, "FAIL");
    assert.ok(phase.blockers[0]!.includes(String(AUDIO_GATE_THRESHOLDS.maxFailureRate * 100)));
  });

  it("FAIL when queue stalled or failed jobs exceed threshold", () => {
    const stalled = evaluateQueuePhase({
      redisReachable: true,
      workerAvailable: true,
      queueMode: "bullmq",
      failedJobs: 2,
      stalledJobs: 1,
      waitingJobs: 0,
      activeJobs: 0,
    });
    assert.equal(stalled.status, "FAIL");

    const failed = evaluateQueuePhase({
      redisReachable: true,
      workerAvailable: true,
      queueMode: "bullmq",
      failedJobs: 60,
      stalledJobs: 0,
      waitingJobs: 0,
      activeJobs: 0,
    });
    assert.equal(failed.status, "FAIL");
  });

  it("FAIL when TTFA exceeds gate", () => {
    const phase = evaluateTtsPhase({
      generationOk: true,
      playbackUrlValid: true,
      ttfaMs: 4000,
      generationLatencyMs: null,
      cacheLatencyMs: null,
      openAiConfigured: true,
      storageOk: true,
    });
    assert.equal(phase.status, "FAIL");
  });

  it("FAIL when any static sample invalid", () => {
    const phase = evaluateStaticPhase([
      { hash: "a", ok: true, status: 200, contentLength: 5000, contentType: "audio/mpeg" },
      { hash: "b", ok: false, status: 404, contentLength: 0, contentType: "text/plain" },
    ]);
    assert.equal(phase.status, "FAIL");
  });

  it("FAIL on security regression", () => {
    const phase = evaluateSecurityPhase({
      staticMissingPostProtected: false,
      adminDashboardProtected: true,
      adminSystemHealthProtected: true,
      storyStreamRequiresAuth: null,
    });
    assert.equal(phase.status, "FAIL");
  });

  it("WARNING when cache hit rate is zero (unverified)", () => {
    const phase = evaluateCachePhase({
      hitRate: 0,
      hitRateVerified: false,
      memoryOk: true,
      redisOk: false,
      gcsOk: true,
      postgresOk: true,
    });
    assert.equal(phase.status, "WARNING");
    assert.ok(phase.warnings.some((w) => w.includes("unverified")));
  });

  it("SKIPPED phases do not contribute score of 100", () => {
    const report = evaluateAudioHealthGate({
      infraAudioOk: true,
      staticCircuitOpen: false,
      phaseSkips: {
        "Queue health": "INTERNAL_HEALTH_SECRET not configured",
        "Log analysis (24h)": "ADMIN_AUTH_TOKEN not configured",
      },
      tts: healthyInput.tts,
      prewarm: healthyInput.prewarm,
      staticSamples: healthyInput.staticSamples,
      cache: healthyInput.cache,
      security: healthyInput.security,
    });
    assert.equal(report.categories.Queue.score, null);
    assert.equal(report.categories.Queue.status, "skip");
    assert.equal(report.categories.Observability.score, null);
    assert.ok(report.phases.some((p) => p.name === "Queue health" && p.status === "SKIPPED"));
  });

  it("FAIL when production secrets missing", () => {
    const blockers = validateProductionSecrets({ apiUrl: "https://example.com", requireProductionSecrets: true });
    assert.equal(blockers.length, 1);
    assert.ok(blockers[0]!.includes("INTERNAL_HEALTH_SECRET"));
    const report = evaluateAudioHealthGate({
      infraAudioOk: true,
      configBlockers: blockers,
    });
    assert.equal(report.decision, "FAIL");
  });

  it("WARNING cannot mask FAIL", () => {
    const report = evaluateAudioHealthGate({
      ...healthyInput,
      tts: {
        ...healthyInput.tts,
        generationOk: false,
        openAiConfigured: false,
        playbackUrlValid: false,
      },
      prewarm: {
        warmupSuccessRate: null,
        lockOk: true,
        recentWarmupFailures: 0,
        recentWarmupTotal: 0,
      },
    });
    assert.equal(report.decision, "FAIL");
    assert.ok(report.warnings.length > 0);
  });

  it("emits explicit SKIPPED phase records", () => {
    const skipped = skippedPhase("Queue health", "INTERNAL_HEALTH_SECRET not configured");
    assert.equal(skipped.status, "SKIPPED");
    assert.equal(skipped.metrics.skipReason, "INTERNAL_HEALTH_SECRET not configured");
  });

  it("accepts valid MP3 when Content-Length is missing (CDN/edge)", () => {
    const mpeg = new Uint8Array(600);
    mpeg[0] = 0xff;
    mpeg[1] = 0xfb;
    const judged = evaluateStaticAudioResponse({
      status: 200,
      contentType: "audio/mpeg",
      contentLengthHeader: null,
      body: mpeg,
      staticSource: "asset",
    });
    assert.equal(judged.ok, true);
    assert.equal(judged.contentLength, 600);
  });

  it("rejects CDN placeholder bodies even with audio MIME", () => {
    const mpeg = new Uint8Array(256);
    mpeg[0] = 0xff;
    mpeg[1] = 0xfb;
    const judged = evaluateStaticAudioResponse({
      status: 200,
      contentType: "audio/mpeg",
      contentLengthHeader: 256,
      body: mpeg,
      staticSource: "placeholder",
    });
    assert.equal(judged.ok, false);
    assert.match(judged.error ?? "", /placeholder/i);
  });
});
