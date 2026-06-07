import { test } from "node:test";
import assert from "node:assert/strict";
import { clearDistributedRateLimits, checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";

test("checkDistributedRateLimit allows requests under cap (in-memory fallback)", async () => {
  clearDistributedRateLimits();
  const key = `test-${Date.now()}`;
  const first = await checkDistributedRateLimit(key, { windowMs: 60_000, maxPerWindow: 3 });
  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 2);
});

test("checkDistributedRateLimit blocks after max (in-memory fallback)", async () => {
  clearDistributedRateLimits();
  const key = `test-block-${Date.now()}`;
  for (let i = 0; i < 3; i++) {
    const r = await checkDistributedRateLimit(key, { windowMs: 60_000, maxPerWindow: 3 });
    assert.equal(r.allowed, true, `request ${i + 1} should be allowed`);
  }
  const blocked = await checkDistributedRateLimit(key, { windowMs: 60_000, maxPerWindow: 3 });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs >= 0);
});
