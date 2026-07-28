import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { getAllTopics } from "../../topics/index.js";
import { exportWorkflowResult } from "../export/index.js";
import { InMemoryWorkflowStore } from "../persistence/index.js";
import { WorkflowOrchestrator } from "./engine.js";

describe("WorkflowOrchestrator", () => {
  it("runs GenerateOneVideo end-to-end through Phases 1–6", async () => {
    const config = {
      ...loadDefaultConfig(),
      dailyVideoCount: 1,
      maximumRetries: 0,
      renderer: "mock" as const,
      publishingProvider: "mock" as const,
      scriptProvider: "mock" as const,
    };
    const topicId = getAllTopics()[0]!.id;
    const { result, telemetry } = await new WorkflowOrchestrator({
      config,
      sleep: async () => undefined,
    }).run({
      type: "GenerateOneVideo",
      topicId,
      trigger: "manual",
    });

    assert.equal(result.version, "7.0.0");
    assert.equal(result.status, "completed");
    assert.equal(result.videosGenerated, 1);
    assert.equal(result.videosPublished, 1);
    assert.ok(result.videoUnits[0]?.videoId);
    assert.ok(result.events.some((e) => e.kind === "ContentGenerated"));
    assert.ok(result.events.some((e) => e.kind === "Published"));
    assert.ok(result.events.some((e) => e.kind === "Completed"));
    assert.equal(telemetry.name, "workflow.execute");
    assert.equal(result.executionSummary.videos[0]?.topicId, topicId);
  });

  it("runs daily batches and exports reports", async () => {
    const config = {
      ...loadDefaultConfig(),
      dailyVideoCount: 2,
      maximumRetries: 0,
      renderer: "mock" as const,
      publishingProvider: "mock" as const,
      scriptProvider: "mock" as const,
      fallbackProvider: "mock" as const,
    };
    const { result } = await new WorkflowOrchestrator({
      config,
      sleep: async () => undefined,
    }).run({ type: "GenerateDailyVideos", trigger: "cron" });

    assert.equal(result.videoUnits.length, 2);
    assert.equal(result.videosPublished, 2);
    const report = exportWorkflowResult(result, "workflow-report-v1");
    assert.equal(JSON.parse(report.content).format, "workflow-report-v1");
  });

  it("resumes from checkpoints without restarting completed phases", async () => {
    const config = {
      ...loadDefaultConfig(),
      maximumRetries: 0,
      resumeOnFailure: true,
      renderer: "mock" as const,
      publishingProvider: "mock" as const,
      scriptProvider: "mock" as const,
      fallbackProvider: "mock" as const,
    };
    const store = new InMemoryWorkflowStore();
    const orchestrator = new WorkflowOrchestrator({
      config,
      store,
      sleep: async () => undefined,
    });

    const first = await orchestrator.run({
      type: "GenerateOneVideo",
      topicId: getAllTopics()[1]!.id,
    });
    assert.equal(first.result.status, "completed");

    const persisted = store.get(first.result.workflowId)!;
    persisted.status = "failed";
    persisted.videoUnits[0]!.status = "failed";
    persisted.videoUnits[0]!.artifacts.published = undefined;
    persisted.videoUnits[0]!.latestCheckpoint = "Rendered";
    store.save(persisted);

    const resumed = await orchestrator.resume(first.result.workflowId);
    assert.equal(resumed.result.status, "completed");
    assert.equal(resumed.result.videosPublished, 1);
    assert.equal(
      resumed.result.videoUnits[0]?.artifacts.content?.title,
      first.result.videoUnits[0]?.artifacts.content?.title,
    );
  });

  it("supports parallel execution via concurrency settings", async () => {
    const config = {
      ...loadDefaultConfig(),
      dailyVideoCount: 2,
      workflowConcurrency: 2,
      parallelRendering: true,
      maximumRetries: 0,
      renderer: "mock" as const,
      publishingProvider: "mock" as const,
      scriptProvider: "mock" as const,
      fallbackProvider: "mock" as const,
    };
    const { result } = await new WorkflowOrchestrator({
      config,
      sleep: async () => undefined,
    }).run({ type: "GenerateDailyVideos" });

    assert.equal(result.videoUnits.length, 2);
    assert.equal(result.status, "completed");
    assert.ok(result.telemetry.executionTimeMs >= 0);
  });
});
