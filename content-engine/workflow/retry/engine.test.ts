import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeWorkflowBackoff, withWorkflowRetry } from "./engine.js";

describe("workflow retry", () => {
  it("computes exponential backoff", () => {
    const a = computeWorkflowBackoff(0, 100, 1000);
    const b = computeWorkflowBackoff(3, 100, 1000);
    assert.ok(a >= 100);
    assert.ok(b <= 1000);
  });

  it("retries failed operations", async () => {
    let calls = 0;
    const result = await withWorkflowRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        sleep: async () => undefined,
      },
    );
    assert.equal(result.value, "ok");
    assert.equal(calls, 3);
  });
});
