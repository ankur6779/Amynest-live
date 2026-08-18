import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import { resolveOpenAiChatModel } from "../openai-model-catalog.js";
import type { OlympiadDifficulty } from "@workspace/olympiad";

const HintResponseSchema = z.object({
  hint: z.string().min(1).max(200),
});

export async function runOlympiadHint(input: {
  question: string;
  options: string[];
  difficulty: OlympiadDifficulty;
  ageYears: number;
}): Promise<string | null> {
  const prompt = `Give ONE short hint (max 2 sentences) for this olympiad MCQ for a ${input.ageYears}-year-old.
Do NOT reveal the answer or option letter. Guide thinking only.

Question: ${input.question}
Options: ${input.options.join(" | ")}
Difficulty: ${input.difficulty}

Output JSON only: {"hint":"..."}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: resolveOpenAiChatModel("legacy"),
      temperature: 0.5,
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: "You give kid-friendly quiz hints without spoiling the answer. JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    12_000,
  );
  if (!outcome.content) return null;
  try {
    const parsed = HintResponseSchema.parse(JSON.parse(outcome.content));
    return parsed.hint.trim();
  } catch {
    return null;
  }
}

/** Free-tier fallback: first clause of explanation without naming the answer. */
export function localOlympiadHint(explanation: string, correctOption: string): string {
  const first = explanation.split(/[.!?]/)[0]?.trim() ?? explanation;
  const withoutAnswer = first.replace(new RegExp(correctOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "…");
  return withoutAnswer.length > 10 ? withoutAnswer : "Think about what the question is really asking.";
}
