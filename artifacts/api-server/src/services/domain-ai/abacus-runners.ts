import { chatCompletionWithTimeout } from "../openai-chat.js";
import { resolveOpenAiChatModel } from "../openai-model-catalog.js";
import { buildAbacusTutorPrompt, type LevelId } from "@workspace/abacus";
import { appendLearningZoneEnglishRule } from "../../lib/learning-zone-english.js";

function buildAbacusTutorFallback(question: string, language: "en" | "hi"): string {
  const trimmed = question.trim().slice(0, 120);
  if (language === "hi") {
    return trimmed
      ? `Chalo step-by-step karte hain: "${trimmed}". Pehle ones column se shuru karo, ek bead ek baar mein hilaao, phir agle rod pe carry karo. Pehle column pe kya aaya?`
      : "Sabse right column se shuru karo. Ek bead ek baar mein hilaao aur pehle rod pe count batao.";
  }
  return trimmed
    ? `Let's tackle this step by step: "${trimmed}". Start on the ones column, move one bead at a time, then carry to the next rod. Tell me what you get on the first column.`
    : "Start on the rightmost column. Move one bead at a time and tell me what you count on the first rod.";
}

export async function runAbacusTutor(input: {
  level: LevelId;
  ageYears: number;
  language: "en" | "hi";
  question: string;
  coachFragment?: string;
}): Promise<{ ok: true; reply: string }> {
  const { system, user } = buildAbacusTutorPrompt({
    level: input.level,
    ageYears: input.ageYears,
    language: input.language,
    question: input.question,
    coachFragment: input.coachFragment,
  });
  const systemWithRules =
    input.language === "en" ? appendLearningZoneEnglishRule(system) : system;
  const outcome = await chatCompletionWithTimeout(
    {
      model: resolveOpenAiChatModel("legacy"),
      messages: [
        { role: "system", content: systemWithRules },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_completion_tokens: 220,
    },
    15_000,
  );
  const reply = outcome.content?.trim() ?? "";
  if (!reply) {
    return { ok: true, reply: buildAbacusTutorFallback(input.question, input.language) };
  }
  return { ok: true, reply };
}
