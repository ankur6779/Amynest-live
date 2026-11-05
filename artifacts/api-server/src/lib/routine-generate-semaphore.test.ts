import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  acquireRoutineGenerateSlot,
  releaseRoutineGenerateSlot,
  resetRoutineGenerateSemaphoreForTests,
  ROUTINE_GEN_INCR_LUA,
} from "./routine-generate-semaphore.js";

const here = dirname(fileURLToPath(import.meta.url));

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

  it("ROUTINE_GEN_INCR_LUA re-arms expire when TTL is missing", () => {
    assert.match(ROUTINE_GEN_INCR_LUA, /INCR/);
    assert.match(ROUTINE_GEN_INCR_LUA, /TTL/);
    assert.match(ROUTINE_GEN_INCR_LUA, /ttl < 0/);
    assert.match(ROUTINE_GEN_INCR_LUA, /EXPIRE/);
  });

  it("acquire path uses heal-capable lua (no n===1 expire)", () => {
    const src = readFileSync(join(here, "routine-generate-semaphore.ts"), "utf8");
    assert.match(src, /ROUTINE_GEN_INCR_LUA/);
    assert.match(src, /redis\.eval\(/);
    assert.doesNotMatch(src, /if \(n === 1\)/);
  });
});
