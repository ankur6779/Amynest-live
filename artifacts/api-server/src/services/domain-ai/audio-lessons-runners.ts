import { generateOpenAiTts } from "../ttsGenerate.js";

export async function runAudioLessonsPregenerate(input: {
  texts: string[];
}): Promise<{
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
  skipped: number;
}> {
  const results = await Promise.allSettled(
    input.texts.map((text) =>
      generateOpenAiTts({ text, mode: "default", category: "sentences" }),
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
