import { chatCompletionWithTimeout } from "../openai-chat.js";
import { buildAbacusTutorPrompt, type LevelId } from "@workspace/abacus";

export async function runAbacusTutor(input: {
  level: LevelId;
  ageYears: number;
  language: "en";
  question: string;
}): Promise<{ ok: true; reply: string }> {
  const { system, user } = buildAbacusTutorPrompt({
    level: input.level,
    ageYears: input.ageYears,
    language: input.language,
    question: input.question,
  });
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_completion_tokens: 220,
    },
    15_000,
  );
  const reply = outcome.content?.trim() ?? "";
  if (!reply) throw new Error("empty_ai_reply");
  return { ok: true, reply };
}
