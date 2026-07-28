import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WorkflowQueue } from "./engine.js";

describe("WorkflowQueue", () => {
  it("supports priority ordering and FIFO fallback", () => {
    const queue = new WorkflowQueue({ mode: "priority", concurrency: 1 });
    queue.enqueue({ type: "GenerateOneVideo" }, { priority: 1 });
    queue.enqueue({ type: "GenerateDailyVideos" }, { priority: 5 });
    const first = queue.claim()!;
    assert.equal(first.payload.type, "GenerateDailyVideos");
    queue.complete(first.id);
    const second = queue.claim()!;
    assert.equal(second.payload.type, "GenerateOneVideo");
  });

  it("supports delayed jobs, retries, and dead-letter queue", async () => {
    const queue = new WorkflowQueue({ concurrency: 1 });
    const job = queue.enqueue(
      { type: "GenerateOneVideo", delayMs: 20 },
      { delayMs: 20 },
    );
    assert.equal(queue.claim(), undefined);
    await new Promise((r) => setTimeout(r, 25));
    const claimed = queue.claimById(job.id)!;
    assert.equal(claimed.status, "active");
    queue.fail(claimed.id, { retry: true, delayMs: 10 });
    assert.equal(queue.list().some((j) => j.id === job.id), true);
    await new Promise((r) => setTimeout(r, 15));
    const again = queue.claimById(job.id)!;
    queue.fail(again.id, { retry: false });
    assert.equal(queue.listDeadLetters().length, 1);
  });

  it("enforces concurrency limits", () => {
    const queue = new WorkflowQueue({ concurrency: 1 });
    queue.enqueue({ type: "GenerateOneVideo" });
    queue.enqueue({ type: "GenerateDailyVideos" });
    const a = queue.claim();
    const b = queue.claim();
    assert.ok(a);
    assert.equal(b, undefined);
    queue.complete(a!.id);
    assert.ok(queue.claim());
  });
});
