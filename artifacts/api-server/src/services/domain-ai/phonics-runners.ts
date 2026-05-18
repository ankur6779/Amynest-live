import { chatCompletionWithTimeout } from "../openai-chat.js";
import { synthesize, readCachedAudio } from "../elevenLabsService.js";
import { PHONEME_PROMPTS } from "../../routes/phonics.js";

export async function runPhonicsSound(input: { letter: string }): Promise<{
  cacheKey: string;
  buffer: Buffer;
}> {
  const key = input.letter.toLowerCase();
  const prompt = PHONEME_PROMPTS[key as keyof typeof PHONEME_PROMPTS];
  if (!prompt) throw new Error("invalid_letter");
  const result = await synthesize(prompt, { mode: "phonics" });
  const cached = await readCachedAudio(result.cacheKey);
  if (!cached?.buffer?.byteLength) throw new Error("audio_unavailable");
  return { cacheKey: result.cacheKey, buffer: cached.buffer };
}

export async function runPhonicsWeeklyInsight(input: {
  prompt: string;
}): Promise<{ message: string; suggestion: string }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: input.prompt }],
      max_completion_tokens: 200,
      temperature: 0.6,
    },
    12_000,
  );
  const raw = outcome.content?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw) as { message?: string; suggestion?: string };
    return {
      message: String(parsed.message ?? "").slice(0, 500),
      suggestion: String(parsed.suggestion ?? "").slice(0, 500),
    };
  } catch {
    return { message: raw.slice(0, 500), suggestion: "" };
  }
}
