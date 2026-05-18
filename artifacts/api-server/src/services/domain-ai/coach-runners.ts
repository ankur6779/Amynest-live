import { chatCompletionWithTimeout } from "../openai-chat.js";

export async function runCoachExtend(input: {
  systemPrompt: string;
  userPrompt: string;
  startWinNumber: number;
}): Promise<{ wins: unknown[]; source: "ai" | "fallback"; usedFallback: boolean }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
    },
    30_000,
  );
  if (!outcome.content) {
    return { wins: [], source: "fallback", usedFallback: true };
  }
  const parsed = JSON.parse(outcome.content) as { wins?: unknown[] };
  const arr = parsed.wins;
  if (Array.isArray(arr) && arr.length === 3) {
    return { wins: arr, source: "ai", usedFallback: false };
  }
  return { wins: [], source: "fallback", usedFallback: true };
}

export async function runCoachStreamPlan(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ raw: string }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8000,
    },
    90_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");
  return { raw: outcome.content };
}

export async function runCoachInitialWins(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ raw: string }> {
  const payload = JSON.parse(input.userPrompt) as {
    input: import("../coachWinGenerationService.js").CoachInput;
    goalLabel: string;
    topicBlock: string;
  };
  const { generateInitialCoachWins } = await import("../coachWinGenerationService.js");
  const { plan } = await generateInitialCoachWins(
    payload.input,
    payload.goalLabel,
    "",
    () => payload.topicBlock,
  );
  return { raw: JSON.stringify(plan) };
}

export async function runCoachRemainingWins(job: {
  generationId: string;
  sessionId: string;
  userId: string;
  cacheKey: string;
  input: import("../coachWinGenerationService.js").CoachInput;
  partialPlan: import("../coachWinGenerationService.js").CoachPlan;
  goalLabel: string;
  goalBrief: string;
}): Promise<{ ok: true }> {
  const svc = await import("../coachWinGenerationService.js");
  const { wins: remaining, aiOk } = await svc.generateRemainingWinsWithAi(
    job.input,
    job.goalLabel,
    job.goalBrief,
    job.partialPlan,
    job.partialPlan.wins,
    () => "",
  );
  const fullPlan = svc.mergeCoachPlan(job.partialPlan, job.partialPlan.wins, remaining);
  if (aiOk) await svc.dbSetCoachCache(job.cacheKey, job.input, fullPlan);
  await svc.upsertCoachGeneration({
    generationId: job.generationId,
    sessionId: job.sessionId,
    userId: job.userId,
    cacheKey: job.cacheKey,
    input: job.input,
    plan: fullPlan,
    status: "complete",
  });
  await svc.updateCoachSessionPlan(job.userId, job.sessionId, fullPlan);
  return { ok: true };
}
