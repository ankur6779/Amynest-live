import { chatCompletionWithTimeout } from "../openai-chat.js";
import {
  buildInfantFeedingPlanPrompt,
  buildInfantFeedingPlanFallback,
  sanitizeInfantFeedingPlan,
  type InfantFeedingPlan,
  type InfantFeedingPlanContext,
} from "../../lib/infant-feeding-prompts.js";
import {
  estimateTokensFromText,
  logInfantAiCost,
} from "../infantAiCostMonitor.js";

const MODEL = "gpt-4o-mini";

export async function runInfantFeedingPlan(input: {
  context: InfantFeedingPlanContext;
  userId?: string;
  childId?: number;
}): Promise<{ plan: InfantFeedingPlan; cached: false }> {
  const startedAt = Date.now();
  const prompt = buildInfantFeedingPlanPrompt(input.context);
  const outcome = await chatCompletionWithTimeout(
    {
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a pediatric nutrition assistant for infants. Output ONLY strict JSON, no prose.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
    },
    35_000,
  );

  if (input.userId) {
    logInfantAiCost({
      job: "infant_feeding_plan",
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
    return { plan: buildInfantFeedingPlanFallback(input.context), cached: false };
  }

  try {
    const parsed = JSON.parse(outcome.content) as unknown;
    const plan = sanitizeInfantFeedingPlan(parsed);
    if (!plan) return { plan: buildInfantFeedingPlanFallback(input.context), cached: false };
    return { plan, cached: false };
  } catch {
    return { plan: buildInfantFeedingPlanFallback(input.context), cached: false };
  }
}
