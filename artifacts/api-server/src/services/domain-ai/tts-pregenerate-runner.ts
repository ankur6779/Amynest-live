import { generateOpenAiTts } from "../ttsGenerate.js";
import type { SynthesizeMode } from "../ttsCacheService.js";

export async function runTtsPregenerate(input: {
  texts: string[];
  mode?: SynthesizeMode;
}): Promise<{
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
  skipped: number;
}> {
  const mode = input.mode ?? "default";
  const results = await Promise.allSettled(
    input.texts.map((text) =>
      generateOpenAiTts({
        text,
        mode,
        category: mode === "phonics" ? "phonics" : "words",
      }),
    ),
  );
  const succeeded = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value),
  ).length;
  const cached = results.filter(
    (r) => r.status === "fulfilled" && r.value?.cached,
  ).length;
  return {
    ok: true,
    total: input.texts.length,
    succeeded,
    failed,
    cached,
    skipped: 0,
  };
}
