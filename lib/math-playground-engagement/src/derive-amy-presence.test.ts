import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveAmyPresence } from "./derive-amy-presence.ts";

describe("math-playground-engagement derive-amy-presence", () => {
  it("celebrates on success", () => {
    const output = deriveAmyPresence({
      consecutiveSuccesses: 1,
      consecutiveFailures: 0,
      sessionLengthMs: 30_000,
      idleMs: 0,
      justSucceeded: true,
    });
    assert.equal(output.mood, "celebrating");
    assert.ok(output.reaction);
  });

  it("encourages after failures", () => {
    const output = deriveAmyPresence({
      consecutiveSuccesses: 0,
      consecutiveFailures: 3,
      sessionLengthMs: 60_000,
      idleMs: 0,
      justFailed: true,
    });
    assert.equal(output.mood, "encouraging");
    assert.ok(output.reaction);
  });

  it("re-engages on long idle", () => {
    const output = deriveAmyPresence({
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      sessionLengthMs: 120_000,
      idleMs: 10_000,
    });
    assert.ok(output.reaction);
    assert.equal(output.reaction!.mood, "idle");
  });
});
