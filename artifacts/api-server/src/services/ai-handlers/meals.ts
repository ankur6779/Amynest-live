import { chatCompletionWithTimeout } from "../openai-chat.js";
import { unwrapJobPayload } from "../../queue/ai-job-payload.js";

export async function handleMealsJob(
  type: string,
  payload: unknown,
): Promise<unknown> {
  const { input } = unwrapJobPayload(payload);
  switch (type) {
    case "meals.generate":
      return handleMealsGenerate(input);
    case "meals.ai_generate":
      return handleMealsAiGenerate(input);
    case "meals.week_plan":
      return handleMealsWeekPlan(input);
    case "meals.family_portions":
      return handleMealsFamilyPortions(input);
    default:
      throw new Error(`unknown_meals_job:${type}`);
  }
}

async function handleMealsGenerate(input: unknown): Promise<unknown> {
  const { runMealsGenerateAi } = await import("../domain-ai/meals-runners.js");
  return runMealsGenerateAi(input as Parameters<typeof runMealsGenerateAi>[0]);
}

async function handleMealsAiGenerate(input: unknown): Promise<unknown> {
  const { runMealsAiGenerate } = await import("../domain-ai/meals-runners.js");
  return runMealsAiGenerate(input as Parameters<typeof runMealsAiGenerate>[0]);
}

async function handleMealsWeekPlan(input: unknown): Promise<unknown> {
  const { runMealsWeekPlan } = await import("../domain-ai/meals-runners.js");
  return runMealsWeekPlan(input as Parameters<typeof runMealsWeekPlan>[0]);
}

async function handleMealsFamilyPortions(input: unknown): Promise<unknown> {
  const { runMealsFamilyPortions } = await import("../domain-ai/meals-runners.js");
  return runMealsFamilyPortions(input as Parameters<typeof runMealsFamilyPortions>[0]);
}
