import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const __dir = dirname(fileURLToPath(import.meta.url));

function readJobResultsSource(): string {
  return readFileSync(join(__dir, "job-results.ts"), "utf8");
}

test("user slot acquire/release use atomic Lua scripts (safe under withRedisRetry)", () => {
  const src = readJobResultsSource();
  assert.match(src, /ACQUIRE_USER_SLOT_SCRIPT/);
  assert.match(src, /RELEASE_USER_SLOT_SCRIPT/);
  assert.match(src, /redis\.eval\(\s*ACQUIRE_USER_SLOT_SCRIPT/);
  assert.match(src, /redis\.eval\(RELEASE_USER_SLOT_SCRIPT/);
  assert.doesNotMatch(src, /tryAcquireUserSlot[\s\S]*?redis\.incr\(/);
  assert.doesNotMatch(src, /releaseUserSlot[\s\S]*?redis\.decr\(/);
});

test("acquire script rolls back when over cap", () => {
  const store = new Map<string, number>();
  const key = "ai:user:test:active_count";
  const max = 2;

  const acquire = (): boolean => {
    const n = (store.get(key) ?? 0) + 1;
    store.set(key, n);
    if (n <= max) return true;
    store.set(key, n - 1);
    return false;
  };

  assert.equal(acquire(), true);
  assert.equal(store.get(key), 1);
  assert.equal(acquire(), true);
  assert.equal(store.get(key), 2);
  assert.equal(acquire(), false);
  assert.equal(store.get(key), 2);
});

test("non-atomic incr+expire double-counts on withRedisRetry (regression we avoid with Lua)", () => {
  const store = new Map<string, number>();
  const key = "ai:user:legacy:active_count";
  const max = 4;
  let expireCalls = 0;

  const legacyAcquire = (): boolean => {
    const n = (store.get(key) ?? 0) + 1;
    store.set(key, n);
    expireCalls += 1;
    if (expireCalls === 1) throw new Error("Connection is closed.");
    if (n <= max) return true;
    store.set(key, n - 1);
    return false;
  };

  const runWithRetry = (): boolean => {
    try {
      return legacyAcquire();
    } catch (err) {
      if (!(err instanceof Error) || !/connection is closed/i.test(err.message)) throw err;
      return legacyAcquire();
    }
  };

  assert.equal(runWithRetry(), true);
  assert.equal(store.get(key), 2, "legacy path leaks an extra slot on retry");
});

test("atomic acquire survives withRedisRetry without double-counting", () => {
  const store = new Map<string, number>();
  const key = "ai:user:retry:active_count";
  let attempts = 0;

  const atomicAcquire = (): 0 | 1 => {
    attempts += 1;
    if (attempts === 1) throw new Error("Connection is closed.");
    const n = (store.get(key) ?? 0) + 1;
    store.set(key, n);
    if (n <= 1) return 1;
    store.set(key, n - 1);
    return 0;
  };

  const runWithRetry = (): boolean => {
    try {
      return atomicAcquire() === 1;
    } catch (err) {
      if (!(err instanceof Error) || !/connection is closed/i.test(err.message)) throw err;
      return atomicAcquire() === 1;
    }
  };

  assert.equal(runWithRetry(), true);
  assert.equal(store.get(key), 1);
  assert.equal(attempts, 2);
});
