import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  acquireRoutineGenerateSlot,
  releaseRoutineGenerateSlot,
  resetRoutineGenerateSemaphoreForTests,
} from "./routine-generate-semaphore.js";

describe("routine-generate-semaphore", () => {
  beforeEach(() => {
    resetRoutineGenerateSemaphoreForTests();
    delete process.env.REDIS_URL;
  });

  it("allows up to max in-flight then returns server_busy shape", async () => {
    process.env.ROUTINE_GEN_MAX_INFLIGHT = "2";
    const a = await acquireRoutineGenerateSlot();
    const b = await acquireRoutineGenerateSlot();
    const c = await acquireRoutineGenerateSlot();
    assert.equal(a.acquired, true);
    assert.equal(b.acquired, true);
    assert.equal(c.acquired, false);
    if (!c.acquired) {
      assert.equal(c.retryAfterSeconds, 30);
    }
    await releaseRoutineGenerateSlot();
    await releaseRoutineGenerateSlot();
  });
});
