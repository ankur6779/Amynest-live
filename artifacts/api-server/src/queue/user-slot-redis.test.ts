import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regression: da20fe25 wrapped INCR+EXPIRE in withRedisRetry. When EXPIRE failed
 * with "Connection is closed.", the retry re-ran INCR and leaked user slots until
 * AI_MAX_USER_ACTIVE_JOBS blocked Amy AI.
 */

const __dir = dirname(fileURLToPath(import.meta.url));

function readJobResultsSource(): string {
  return readFileSync(join(__dir, "job-results.ts"), "utf8");
}

test("tryAcquireUserSlot uses atomic Lua eval instead of separate incr+expire", () => {
  const src = readJobResultsSource();
  const acquireBlock = src.slice(
    src.indexOf("export async function tryAcquireUserSlot"),
    src.indexOf("export async function releaseUserSlot"),
  );
  assert.match(acquireBlock, /redis\.eval\(ACQUIRE_USER_SLOT_LUA/);
  assert.doesNotMatch(acquireBlock, /redis\.incr\(/);
  assert.doesNotMatch(acquireBlock, /redis\.expire\(/);
});

test("releaseUserSlot uses atomic Lua eval instead of separate decr+del", () => {
  const src = readJobResultsSource();
  const releaseBlock = src.slice(src.indexOf("export async function releaseUserSlot"));
  assert.match(releaseBlock, /redis\.eval\(RELEASE_USER_SLOT_LUA/);
  assert.doesNotMatch(releaseBlock, /redis\.decr\(/);
});

test("user slot Lua scripts combine counter mutation with TTL/cleanup", () => {
  const src = readJobResultsSource();
  assert.match(src, /ACQUIRE_USER_SLOT_LUA[\s\S]*INCR[\s\S]*EXPIRE/);
  assert.match(src, /RELEASE_USER_SLOT_LUA[\s\S]*DECR[\s\S]*DEL/);
});
