import { generateOpenAiTts } from "../ttsGenerate.js";
import { isTtsRateLimitedError } from "../ttsCostGuardService.js";

export async function runAudioLessonsPregenerate(input: {
  texts: string[];
  userId?: string;
}): Promise<{
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
  skipped: number;
  rateLimited: number;
}> {
  // Daily tts_generation only runs when ctx.userId is set (cache-miss path).
  // Omitting it silently remints past free/premium caps — same class as the
  // tts.synthesize fix (3fbe9274).
  const ctx =
    input.userId && input.userId !== "anonymous"
      ? { userId: input.userId, route: "audio-lessons/pregenerate" as const }
      : undefined;

  let succeeded = 0;
  let failed = 0;
  let cached = 0;
  let rateLimited = 0;

  for (const text of input.texts) {
    try {
      const result = await generateOpenAiTts(
        { text, mode: "default", category: "sentences" },
        ctx,
      );
      if (!result) {
        failed += 1;
        continue;
      }
      succeeded += 1;
      if (result.cached) cached += 1;
    } catch (err) {
      if (isTtsRateLimitedError(err)) {
        rateLimited += 1;
        // Stop burning provider calls once daily/burst quota is exhausted.
        break;
      }
      failed += 1;
    }
  }

  return {
    ok: true,
    total: input.texts.length,
    succeeded,
    failed,
    cached,
    skipped: 0,
    rateLimited,
  };
}
