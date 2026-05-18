import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import { synthesize } from "../elevenLabsService.js";

const aiWordSchema = z.object({
  word: z.string().min(1).max(40),
  syllables: z.array(z.string().min(1).max(20)).min(1).max(10),
  chunks: z.array(z.string().min(1).max(6)).min(1).max(15),
  hint: z.string().min(3).max(160),
});
const aiResponseSchema = z.object({
  words: z.array(aiWordSchema).min(1).max(15),
});

type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
type SpellingDifficulty = "easy" | "medium" | "hard";

export async function runSpellingAiGenerate(input: {
  age: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  count: number;
}): Promise<{ ok: true; words: unknown[]; source: "ai" }> {
  const ageDescriptor = {
    "2-4": "ages 2-4",
    "4-6": "ages 4-6",
    "6-8": "ages 6-8",
    "8-10+": "ages 8-10+",
  }[input.age];

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content:
            "You generate kid-friendly spelling word lists. Always return strict JSON.",
        },
        {
          role: "user",
          content: `Generate ${input.count} ${input.difficulty} spelling words for ${ageDescriptor}. Return JSON: { "words": [{ "word", "syllables", "chunks", "hint" }] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    },
    25_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");
  const validated = aiResponseSchema.parse(JSON.parse(outcome.content));
  const words = validated.words.map((w) => ({
    id: `ai-${w.word.toLowerCase()}`,
    word: w.word.toLowerCase(),
    ageGroup: input.age,
    difficulty: input.difficulty,
    syllables: w.syllables,
    chunks: w.chunks,
    hint: w.hint,
  }));
  return { ok: true, words, source: "ai" };
}

export async function runSpellingTtsPrewarm(input: {
  words: string[];
}): Promise<{ audioKeys: string[] }> {
  const audioKeys: string[] = [];
  for (const word of input.words) {
    const r = await synthesize(word, {});
    audioKeys.push(r.cacheKey);
  }
  return { audioKeys };
}
