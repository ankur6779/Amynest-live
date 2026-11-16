import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  clearDistributedRateLimits,
  checkDistributedRateLimit,
  FIXED_WINDOW_INCR_LUA,
} from "../lib/distributed-rate-limit.js";

const here = dirname(fileURLToPath(import.meta.url));

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

test("FIXED_WINDOW_INCR_LUA arms expire whenever PTTL is missing (heals poisoned keys)", () => {
  assert.match(FIXED_WINDOW_INCR_LUA, /INCR/);
  assert.match(FIXED_WINDOW_INCR_LUA, /PTTL/);
  assert.match(FIXED_WINDOW_INCR_LUA, /ttl < 0/);
  assert.match(FIXED_WINDOW_INCR_LUA, /PEXPIRE/);
  assert.doesNotMatch(FIXED_WINDOW_INCR_LUA, /count === 1/);
});

test("distributed-rate-limit redis path uses heal-capable lua (no count===1 pexpire)", () => {
  const src = readFileSync(join(here, "distributed-rate-limit.ts"), "utf8");
  assert.match(src, /FIXED_WINDOW_INCR_LUA/);
  assert.match(src, /redis\.eval\(/);
  assert.doesNotMatch(src, /if \(count === 1\)/);
  assert.doesNotMatch(src, /await redis\.pexpire\(/);
});
