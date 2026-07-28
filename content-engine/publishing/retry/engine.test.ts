import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PublishingError } from "../youtube/errors.js";
import { computeBackoff, withRetries } from "./engine.js";

describe("publishing retry engine", () => {
  it("computes exponential backoff capped by max delay", () => {
    const a0 = computeBackoff(0, 100, 1000);
    const a3 = computeBackoff(3, 100, 1000);
    assert.ok(a0 >= 100);
    assert.ok(a3 <= 1000);
    assert.ok(a3 >= a0);
  });

  it("retries retryable errors and returns value", async () => {
    let calls = 0;
    const result = await withRetries(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new PublishingError("network", "temporary", { retryable: true });
        }
        return "ok";
      },
      {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        deadLetterEnabled: true,
      },
      {
        idempotencyKey: "k1",
        renderPackageId: "rp1",
        sleep: async () => undefined,
      },
    );

    assert.equal(result.value, "ok");
    assert.equal(result.attempts.length, 2);
    assert.equal(result.failures, 2);
  });

  it("writes dead-letter records when retries are exhausted", async () => {
    const result = await withRetries(
      async () => {
        throw new PublishingError("quota", "quota exceeded", { retryable: true });
      },
      {
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 5,
        deadLetterEnabled: true,
      },
      {
        idempotencyKey: "k2",
        renderPackageId: "rp2",
        sleep: async () => undefined,
      },
    );

    assert.equal(result.value, undefined);
    assert.ok(result.deadLetter);
    assert.equal(result.deadLetter?.errorCode, "quota");
    assert.equal(result.attempts.length, 2);
  });
});
