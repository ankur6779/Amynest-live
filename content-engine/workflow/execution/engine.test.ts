import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapWithConcurrency, runSequential } from "./engine.js";

describe("workflow execution engine", () => {
  it("runs tasks sequentially", async () => {
    const order: number[] = [];
    await runSequential([1, 2, 3], async (n) => {
      order.push(n);
      return n;
    });
    assert.deepEqual(order, [1, 2, 3]);
  });

  it("runs tasks with configurable concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
      return n * 2;
    });
    assert.deepEqual(results, [2, 4, 6, 8]);
    assert.ok(maxActive <= 2);
  });
});
