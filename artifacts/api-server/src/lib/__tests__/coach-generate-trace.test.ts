import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCoachGenerateTraceTimeline,
  logCoachGenerateTrace,
  resetCoachTraceStoreForTests,
} from "../coach-generate-trace.js";

describe("coach generate trace timeline", () => {
  beforeEach(() => {
    resetCoachTraceStoreForTests();
  });

  it("builds a successful async path timeline", () => {
    const traceId = "success-trace-1";
    const t0 = Date.now();
    logCoachGenerateTrace("render.request_received", { traceId, t0, requestId: "req-1" });
    logCoachGenerateTrace("render.job_enqueued", { traceId, jobId: "job-1" });
    logCoachGenerateTrace("render.response_sent", { traceId, httpStatus: 202 });
    logCoachGenerateTrace("bullmq.job_enqueued", { traceId, jobId: "job-1", layer: "bullmq" });
    logCoachGenerateTrace("bullmq.job_started", { traceId, jobId: "job-1", layer: "bullmq" });
    logCoachGenerateTrace("openai.request_started", { traceId, layer: "openai", timeoutMs: 30_000 });
    logCoachGenerateTrace("openai.request_completed", {
      traceId,
      layer: "openai",
      meta: { durationMs: 4200 },
    });
    logCoachGenerateTrace("bullmq.job_completed", {
      traceId,
      jobId: "job-1",
      layer: "bullmq",
      meta: { durationMs: 4500 },
    });

    const timeline = getCoachGenerateTraceTimeline(traceId);
    assert.equal(timeline.length, 8);
    assert.equal(timeline[0]?.stage, "render.request_received");
    assert.equal(timeline[timeline.length - 1]?.stage, "bullmq.job_completed");
    assert.ok(timeline.every((e) => e.traceId === traceId));
    assert.ok(timeline.every((e) => typeof e.timestamp === "string"));
  });

  it("builds a gateway timeout timeline (504 HTML before render completes)", () => {
    const traceId = "fail-trace-504";
    logCoachGenerateTrace("render.request_received", { traceId, t0: Date.now() });
    logCoachGenerateTrace("render.job_enqueued", { traceId, jobId: "job-2" });
    // No render.response_sent — proxy returned 504 HTML while Render still processing
    logCoachGenerateTrace("bullmq.job_started", { traceId, jobId: "job-2", layer: "bullmq" });
    logCoachGenerateTrace("openai.request_started", { traceId, layer: "openai", timeoutMs: 30_000 });
    logCoachGenerateTrace("openai.request_completed", {
      traceId,
      layer: "openai",
      meta: { durationMs: 12_000 },
    });
    logCoachGenerateTrace("bullmq.job_completed", {
      traceId,
      jobId: "job-2",
      layer: "bullmq",
      meta: { durationMs: 12_500 },
    });

    const timeline = getCoachGenerateTraceTimeline(traceId);
    const stages = timeline.map((e) => e.stage);
    assert.ok(stages.includes("render.request_received"));
    assert.ok(!stages.includes("render.response_sent"));
    assert.ok(stages.includes("bullmq.job_completed"));
  });

  it("records render middleware timeout with timeoutMs", () => {
    const traceId = "fail-trace-render-mw";
    logCoachGenerateTrace("render.request_received", { traceId, t0: Date.now() });
    logCoachGenerateTrace("render.middleware.request_timeout", {
      traceId,
      httpStatus: 504,
      timeoutMs: 65_000,
      layer: "render.middleware",
      contentType: "application/json",
    });

    const timeline = getCoachGenerateTraceTimeline(traceId);
    const timeoutEvent = timeline.find((e) => e.stage === "render.middleware.request_timeout");
    assert.ok(timeoutEvent);
    assert.equal(timeoutEvent?.timeoutMs, 65_000);
    assert.equal(timeoutEvent?.contentType, "application/json");
  });
});
