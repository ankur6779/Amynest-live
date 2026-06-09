/**
 * P0 data integrity — poll finalize idempotency + routine uniqueness wiring.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clearJobStore, createJob, getJob, updateJob } from "../queue/ai-job-store.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import { resolvePollApiBody } from "./ai-job-finalize.js";
import { shapePollApiResult } from "./ai-poll-api-result.js";

const __dir = dirname(fileURLToPath(import.meta.url));

function readSource(rel: string): string {
  return readFileSync(join(__dir, rel), "utf8");
}

describe("P0-1 poll finalize idempotency", () => {
  beforeEach(() => clearJobStore());

  it("resolvePollApiBody persists apiResult + sideEffectsApplied on first poll", async () => {
    const job = createJob(
      "openai.chat",
      "user-1",
      wrapJobInput("ai/assistant-ai", { namespace: "amy-assistant" }, {
        question: "Bedtime tips?",
        userId: "user-1",
      }),
    );
    updateJob(job.id, {
      status: "completed",
      result: { content: "Keep it calm." },
    });

    const body = await resolvePollApiBody(getJob(job.id)!);
    assert.deepEqual(body, { answer: "Keep it calm." });

    const stored = getJob(job.id)!;
    assert.equal(stored.sideEffectsApplied, true);
    assert.deepEqual(stored.apiResult, { answer: "Keep it calm." });
  });

  it("20 sequential completed polls return cached apiResult (no re-finalize)", async () => {
    const job = createJob(
      "tts.synthesize",
      "user-1",
      wrapJobInput("tts/synthesize", {}, {}),
    );
    updateJob(job.id, {
      status: "completed",
      result: {
        audioUrl: "https://cdn.example.com/tts/abc.mp3",
        cacheKey: "abc",
        cached: true,
      },
    });

    const results: unknown[] = [];
    for (let i = 0; i < 20; i++) {
      results.push(await resolvePollApiBody(getJob(job.id)!));
    }

    for (const r of results) {
      assert.equal((r as { ok?: boolean }).ok, true);
      assert.equal((r as { audioUrl?: string }).audioUrl, "https://cdn.example.com/tts/abc.mp3");
    }
    assert.deepEqual(results[0], results[19]);

    const stored = getJob(job.id)!;
    assert.equal(stored.sideEffectsApplied, true);
    assert.notEqual(stored.apiResult, undefined);
  });

  it("shapePollApiResult honors skipSideEffects for assistant route", async () => {
    const job = createJob(
      "openai.chat",
      "user-1",
      wrapJobInput("ai/assistant-ai", { namespace: "amy-assistant" }, {
        question: "Q",
        userId: "user-1",
      }),
    );
    updateJob(job.id, { status: "completed", result: { content: "A" } });

    const withEffects = await shapePollApiResult(getJob(job.id)!, { content: "A" });
    const withoutEffects = await shapePollApiResult(
      getJob(job.id)!,
      { content: "A" },
      { skipSideEffects: true },
    );
    assert.deepEqual(withEffects, withoutEffects);
  });

  it("finalizeLearningLoadMorePoll skipSideEffects skips cache persist block", () => {
    const src = readSource("../services/learningLoadMoreService.ts");
    assert.match(src, /if \(!skipSideEffects\) \{\s*await saveCachedItems\(/);
  });

  it("resolvePollApiBody wires finalize lock + apiResult cache", () => {
    const src = readSource("./ai-job-finalize.ts");
    assert.match(src, /tryAcquirePollFinalizeLock/);
    assert.match(src, /sideEffectsApplied: true/);
    assert.match(src, /if \(job\.apiResult !== undefined\) return job\.apiResult/);
  });
});

describe("P0-2 routine uniqueness", () => {
  it("schema declares routines_child_date_uq", () => {
    const src = readFileSync(
      join(__dir, "../../../../lib/db/src/schema/routines.ts"),
      "utf8",
    );
    assert.match(src, /routines_child_date_uq/);
    assert.match(src, /uniqueIndex\("routines_child_date_uq"\)\.on\(t\.childId, t\.date\)/);
  });

  it("migration dedupes then adds unique index", () => {
    const sql = readFileSync(
      join(__dir, "../../../../lib/db/migrations/0027_routines_child_date_unique.sql"),
      "utf8",
    );
    assert.match(sql, /DELETE FROM routines r/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS routines_child_date_uq/);
  });

  it("POST /routines uses conflict-safe insert paths", () => {
    const src = readSource("../routes/routines.ts");
    assert.match(src, /persistRoutineForChildDate/);
    assert.match(src, /error: "routine_exists"/);
    assert.match(src, /error: "routine_save_failed"/);
  });
});
