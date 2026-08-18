import { chatCompletionWithTimeout } from "../openai-chat.js";
import { resolveOpenAiChatModel } from "../openai-model-catalog.js";
import {
  estimateTokensFromText,
  logInfantAiCost,
} from "../infantAiCostMonitor.js";

export async function runInfantSleepWeeklySummary(input: {
  userId: string;
  childId: number;
  childName: string;
  ageMonths: number;
  statsJson: string;
}): Promise<{ summary: string; highlights: string[]; nextSteps: string[] } | null> {
  const startedAt = Date.now();
  const system = [
    "You are AmyNest's infant sleep coach. Respond ONLY with valid JSON.",
    '{"summary": string, "highlights": string[], "nextSteps": string[]}',
    "Be warm, specific, and actionable. 2–3 sentences in summary; 2–3 bullets each list.",
  ].join("\n");
  const user = [
    `Weekly sleep report for ${input.childName} (${input.ageMonths} months).`,
    `7-day stats: ${input.statsJson}`,
    "Note patterns, celebrate wins, suggest one concrete change for next week.",
  ].join("\n");
  const promptText = `${system}\n${user}`;

  const outcome = await chatCompletionWithTimeout({
    model: resolveOpenAiChatModel("legacy"),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: 400,
    response_format: { type: "json_object" },
  });

  logInfantAiCost({
    job: "infant_sleep_weekly_report",
    userId: input.userId,
    childId: input.childId,
    model: resolveOpenAiChatModel("legacy"),
    estimatedTokens:
      estimateTokensFromText(promptText) + estimateTokensFromText(outcome.content ?? ""),
    cached: false,
    durationMs: Date.now() - startedAt,
  });

  if (!outcome.content) return null;
  try {
    const parsed = JSON.parse(outcome.content) as {
      summary?: string;
      highlights?: string[];
      nextSteps?: string[];
    };
    return {
      summary: String(parsed.summary ?? ""),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
    };
  } catch {
    return null;
  }
}
