import { chatCompletionWithTimeout } from "../openai-chat.js";
import {
  buildInfantSleepCoachPrompt,
  buildInfantSleepCoachFallbackPlan,
  sanitizeInfantSleepCoachPlan,
  type InfantSleepCoachContext,
  type InfantSleepCoachPlan,
} from "../../lib/infant-sleep-prompts.js";
import {
  estimateTokensFromText,
  logInfantAiCost,
} from "../infantAiCostMonitor.js";

const MODEL = "gpt-4o-mini";

export async function runInfantSleepCoach(input: {
  context: InfantSleepCoachContext;
  userId?: string;
  childId?: number;
}): Promise<{ plan: InfantSleepCoachPlan; cached: false }> {
  const startedAt = Date.now();
  const prompt = buildInfantSleepCoachPrompt(input.context);
  const outcome = await chatCompletionWithTimeout(
    {
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a pediatric sleep guidance assistant. Output ONLY strict JSON, no prose.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_completion_tokens: 1000,
      response_format: { type: "json_object" },
    },
    30_000,
  );

  if (input.userId) {
    logInfantAiCost({
      job: "infant_sleep_coach",
      userId: input.userId,
      childId: input.childId,
      model: MODEL,
      estimatedTokens:
        estimateTokensFromText(prompt) + estimateTokensFromText(outcome.content ?? ""),
      cached: false,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!outcome.content) {
    return { plan: buildInfantSleepCoachFallbackPlan(input.context), cached: false };
  }

  try {
    const parsed = JSON.parse(outcome.content) as unknown;
    const plan = sanitizeInfantSleepCoachPlan(parsed);
    if (!plan) return { plan: buildInfantSleepCoachFallbackPlan(input.context), cached: false };
    return { plan, cached: false };
  } catch {
    return { plan: buildInfantSleepCoachFallbackPlan(input.context), cached: false };
  }
}
