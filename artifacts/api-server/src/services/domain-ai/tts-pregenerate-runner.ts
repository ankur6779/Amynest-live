import { generateOpenAiTts } from "../ttsGenerate.js";
import type { SynthesizeMode } from "../ttsCacheService.js";
import { isTtsRateLimitedError } from "../ttsCostGuardService.js";

export async function runTtsPregenerate(input: {
  texts: string[];
  mode?: SynthesizeMode;
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
  const mode = input.mode ?? "default";
  const ctx = input.userId
    ? { userId: input.userId, route: "tts/pregenerate" as const }
    : undefined;

  let succeeded = 0;
  let failed = 0;
  let cached = 0;
  let rateLimited = 0;

  for (const text of input.texts) {
    try {
      const result = await generateOpenAiTts(
        {
          text,
          mode,
          category: mode === "phonics" ? "phonics" : "words",
        },
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
        continue;
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
