import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function readSrc(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

/**
 * Regression: POST /api/tts/generate|synthesize enqueue tts.synthesize jobs.
 * The worker must pass job.userId into generateOpenAiTts so assertTtsCacheMissAllowed
 * enforces daily tts_generation (free 50 / premium 500). Omitting ctx remints past caps.
 */
describe("tts.synthesize job daily quota wiring", () => {
  it("handleTtsSynthesize builds generationCtx from userId before generateOpenAiTts", () => {
    const src = readSrc("../ai-job-handlers.ts");
    assert.match(src, /case "tts\.synthesize"/);
    assert.match(src, /generationCtx/);
    assert.match(src, /generateOpenAiTts\(/);
    assert.match(src, /userId: ctx\.userId/);
    assert.doesNotMatch(
      src,
      /await generateOpenAiTts\(\{\s*text: payload\.text/,
    );
  });

  it("runAiJobHandler accepts userId and forwards it to handleTtsSynthesize", () => {
    const src = readSrc("../ai-job-handlers.ts");
    assert.match(src, /opts\?: \{ userId\?: string \}/);
    assert.match(src, /userId: opts\?\.userId/);
  });

  it("BullMQ worker and memory/inline callers pass userId into runAiJobHandler", () => {
    const worker = readSrc("../../worker/ai-service.ts");
    const memory = readSrc("../../queue/memory-queue.ts");
    const inline = readSrc("../../lib/ai-queue-http.ts");
    assert.match(worker, /runAiJobHandler\(type, payload, \{ userId \}\)/);
    assert.match(memory, /runAiJobHandler\(job\.type, payload, \{ userId: job\.userId \}\)/);
    assert.match(inline, /runAiJobHandler\(opts\.type, opts\.payload, \{\s*userId: opts\.userId,/);
  });

  it("inline AI path maps TtsRateLimitedError to HTTP 429", () => {
    const inline = readSrc("../../lib/ai-queue-http.ts");
    assert.match(inline, /isTtsRateLimitedError/);
    assert.match(inline, /status\(429\)\.json\(ttsRateLimitResponseBody/);
  });
});
