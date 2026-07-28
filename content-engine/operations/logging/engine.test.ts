import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStructuredLogger } from "./engine.js";

describe("structured logging", () => {
  it("emits JSON records with correlation and workflow fields", () => {
    const records: unknown[] = [];
    const logger = createStructuredLogger({
      level: "debug",
      correlationId: "corr-1",
      sink: (record) => records.push(record),
    });
    logger.info("render complete", {
      workflowId: "wf_1",
      videoId: "vid_1",
      topicId: "parenting-001",
      provider: "mock",
      phase: "rendering",
      durationMs: 12,
      retryCount: 0,
    });
    assert.equal(records.length, 1);
    const record = records[0] as Record<string, unknown>;
    assert.equal(record.correlationId, "corr-1");
    assert.equal(record.workflowId, "wf_1");
    assert.equal(record.phase, "rendering");
    assert.ok(typeof record.timestamp === "string");
  });
});
