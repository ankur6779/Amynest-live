import { chatCompletionWithTimeout } from "../openai-chat.js";
import { fallbackExtensionWin } from "../coachExtensionFallback.js";
import { validateWin, type CoachWin } from "../coachWinGenerationService.js";

export async function runCoachExtend(input: {
  systemPrompt: string;
  userPrompt: string;
  startWinNumber: number;
  failedWinTitle?: string;
}): Promise<{ wins: CoachWin[]; source: "ai" | "fallback"; usedFallback: boolean }> {
  const start = input.startWinNumber;
  const failedTitle = input.failedWinTitle ?? "the previous step";

  try {
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
    if (outcome.content) {
      const parsed = JSON.parse(outcome.content) as { wins?: unknown[] };
      const arr = parsed.wins;
      if (Array.isArray(arr) && arr.length >= 1) {
        const candidate = arr[0];
        if (validateWin(candidate)) {
          return {
            wins: [{ ...(candidate as CoachWin), win: start }],
            source: "ai",
            usedFallback: false,
          };
        }
      }
    }
  } catch {
    /* fall through to static fallback */
  }

  return {
    wins: [fallbackExtensionWin(failedTitle, start)],
    source: "fallback",
    usedFallback: true,
  };
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
    intelligenceBlock?: string;
  };
  const { generateInitialCoachWins } = await import("../coachWinGenerationService.js");
  const { plan } = await generateInitialCoachWins(
    payload.input,
    payload.goalLabel,
    "",
    () => payload.topicBlock,
    payload.intelligenceBlock,
  );
  return { raw: JSON.stringify(plan) };
}

export async function runCoachNextWin(input: {
  input: import("../coachWinGenerationService.js").CoachInput;
  goalLabel: string;
  goalBrief: string;
  meta: Pick<import("../coachWinGenerationService.js").CoachPlan, "title" | "root_cause" | "summary">;
  existingWins: import("../coachWinGenerationService.js").CoachWin[];
  nextWinNumber: number;
  topicBlock: string;
  intelligenceBlock?: string;
}): Promise<{ win: import("../coachWinGenerationService.js").CoachWin; aiOk: boolean }> {
  const svc = await import("../coachWinGenerationService.js");
  return svc.generateNextCoachWin(
    input.input,
    input.goalLabel,
    input.goalBrief,
    input.meta,
    input.existingWins,
    input.nextWinNumber,
    () => input.topicBlock,
    input.intelligenceBlock,
  );
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
  intelligenceBlock?: string;
}): Promise<{ ok: true }> {
  const svc = await import("../coachWinGenerationService.js");
  const { wins: remaining, aiOk } = await svc.generateRemainingWinsWithAi(
    job.input,
    job.goalLabel,
    job.goalBrief,
    job.partialPlan,
    job.partialPlan.wins,
    () => "",
    job.intelligenceBlock,
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
