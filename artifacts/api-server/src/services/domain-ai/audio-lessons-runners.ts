import {
  AMY_VOICE_ID_HINDI,
  AMY_MODEL_ID_HINDI,
  synthesize,
} from "../elevenLabsService.js";

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
      synthesize(text, { voiceId: AMY_VOICE_ID_HINDI, modelId: AMY_MODEL_ID_HINDI }),
    ),
  );
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  const cached = results.filter(
    (r) => r.status === "fulfilled" && r.value.cached,
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
