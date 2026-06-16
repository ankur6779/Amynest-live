import { chatCompletionWithTimeout } from "../openai-chat.js";
import { buildAbacusTutorPrompt, type LevelId } from "@workspace/abacus";
import { appendLearningZoneEnglishRule } from "../../lib/learning-zone-english.js";

function buildAbacusTutorFallback(question: string): string {
  const trimmed = question.trim().slice(0, 120);
  return trimmed
    ? `Let's tackle this step by step: "${trimmed}". Start on the ones column, move one bead at a time, then carry to the next rod. Tell me what you get on the first column.`
    : "Start on the rightmost column. Move one bead at a time and tell me what you count on the first rod.";
}

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
        { role: "system", content: appendLearningZoneEnglishRule(system) },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_completion_tokens: 220,
    },
    15_000,
  );
  const reply = outcome.content?.trim() ?? "";
  if (!reply) {
    return { ok: true, reply: buildAbacusTutorFallback(input.question) };
  }
  return { ok: true, reply };
}
