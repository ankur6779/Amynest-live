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
 * Regression after 3fbe9274: remaining TTS job paths must still pass userId into
 * generateOpenAiTts / synthesizeElevenLabsFallback so assertTtsCacheMissAllowed runs.
 */
describe("remaining TTS job daily quota wiring", () => {
  it("audio-lessons.pregenerate route embeds userId in job input", () => {
    const route = readSrc("../../routes/audio-lessons.ts");
    assert.match(route, /type: "audio-lessons\.pregenerate"/);
    assert.match(route, /input: \{ texts: validTexts, userId \}/);
  });

  it("runAudioLessonsPregenerate builds generationCtx before generateOpenAiTts", () => {
    const src = readSrc("../domain-ai/audio-lessons-runners.ts");
    assert.match(src, /userId\?: string/);
    assert.match(src, /route: "audio-lessons\/pregenerate"/);
    assert.match(src, /generateOpenAiTts\(/);
    assert.match(src, /isTtsRateLimitedError/);
    assert.doesNotMatch(
      src,
      /generateOpenAiTts\(\{\s*text,\s*mode: "default",\s*category: "sentences"\s*\}\s*\)/,
    );
  });

  it("ai-coach audio generate + pregenerate pass userId into TTS ctx", () => {
    const route = readSrc("../../routes/ai-coach.ts");
    const cache = readSrc("../coachAudioCacheService.ts");
    const runner = readSrc("../domain-ai/coach-audio-pregenerate-runner.ts");

    assert.match(route, /input: \{ planCacheKey, wins, userId \}/);
    assert.match(route, /generateAndCacheCoachWinAudio\(\{[\s\S]*userId,/);

    assert.match(cache, /userId\?: string/);
    assert.match(cache, /route: "ai-coach\/audio"/);
    assert.match(cache, /synthesizeElevenLabsFallback\([\s\S]*generationCtx/);
    assert.match(cache, /userId: input\.userId/);

    assert.match(runner, /userId\?: string/);
  });

  it("TTS enqueue burst covers audio-lessons and coach pregenerate job types", () => {
    const src = readSrc("../../lib/route-ai-queue.ts");
    assert.match(src, /audio-lessons\.pregenerate/);
    assert.match(src, /ai-coach\.pregenerate_audio/);
  });
});
