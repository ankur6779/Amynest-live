/**
 * Product-wide OpenAI chat model catalog.
 *
 * Tiers:
 *   fast      — conversational parent/child chat (Ask Amy, Tutor, Coach, Talk with Amy)
 *   reasoning — Birth Sky deep turns only
 *   legacy    — high-volume structured JSON (meals, worksheets, olympiad, phonics, …)
 *
 * OPENAI_CHAT_MODEL is a deprecated alias for the LEGACY tier only. It must never
 * collapse Birth Sky FAST/REASONING into one model.
 */

export type OpenAiChatModelTier = "fast" | "reasoning" | "legacy";

export const OPENAI_CHAT_MODEL_DEFAULTS = {
  fast: "gpt-5-mini",
  reasoning: "gpt-5",
  legacy: "gpt-4o-mini",
} as const;

function envModel(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

export function resolveOpenAiChatModelCatalog(): {
  fast: string;
  reasoning: string;
  legacy: string;
} {
  return {
    fast: envModel("OPENAI_CHAT_MODEL_FAST") ?? OPENAI_CHAT_MODEL_DEFAULTS.fast,
    reasoning:
      envModel("OPENAI_CHAT_MODEL_REASONING") ?? OPENAI_CHAT_MODEL_DEFAULTS.reasoning,
    legacy:
      envModel("OPENAI_CHAT_MODEL_LEGACY") ??
      envModel("OPENAI_CHAT_MODEL") ??
      OPENAI_CHAT_MODEL_DEFAULTS.legacy,
  };
}

export function resolveOpenAiChatModel(tier: OpenAiChatModelTier): string {
  return resolveOpenAiChatModelCatalog()[tier];
}

/**
 * GPT-5 Chat Completions reject non-default `temperature` (HTTP 400).
 * Matches `gpt-5`, `gpt-5-mini`, and dotted/date variants (`gpt-5.4-mini`).
 */
export function isGpt5FamilyModel(model: string): boolean {
  const id = model.trim().toLowerCase();
  return id === "gpt-5" || id.startsWith("gpt-5-") || id.startsWith("gpt-5.");
}

/**
 * Spread into Chat Completions request bodies.
 * GPT-5 family: omit `temperature` entirely. Legacy: keep the caller value.
 */
export function openAiChatTemperatureField(
  model: string,
  temperature: number | undefined,
): { temperature: number } | Record<string, never> {
  if (temperature === undefined) return {};
  if (isGpt5FamilyModel(model)) return {};
  return { temperature };
}

/**
 * GPT-5 Chat Completions count reasoning tokens against `max_completion_tokens`.
 * Caps below these floors can finish with `length` and empty visible content.
 * Unused headroom is a cap, not billed usage.
 */
export const GPT5_MIN_COMPLETION_TOKENS_FAST = 1200;
export const GPT5_MIN_COMPLETION_TOKENS_REASONING = 1800;

/** Full GPT-5 (not mini/nano) — Birth Sky REASONING and similar. */
export function isGpt5ReasoningModel(model: string): boolean {
  const id = model.trim().toLowerCase();
  if (!isGpt5FamilyModel(id)) return false;
  return !id.includes("mini") && !id.includes("nano");
}

export function gpt5MinCompletionTokens(model: string): number {
  if (!isGpt5FamilyModel(model)) return 0;
  return isGpt5ReasoningModel(model)
    ? GPT5_MIN_COMPLETION_TOKENS_REASONING
    : GPT5_MIN_COMPLETION_TOKENS_FAST;
}

/**
 * Raise GPT-5-family caps that are too small for reasoning+output.
 * Legacy models keep the caller limit. Callers already above the floor keep theirs.
 */
export function resolveOpenAiCompletionBudget(params: {
  model: string;
  requested?: number;
}): number {
  const requested = params.requested ?? 600;
  if (!isGpt5FamilyModel(params.model)) return requested;
  return Math.max(requested, gpt5MinCompletionTokens(params.model));
}

export type OpenAiEmptyClassification = "ok" | "ai_budget_exhausted" | "ai_empty";

/**
 * Distinguish completion-budget exhaustion (reasoning ate the cap) from a
 * genuine empty completion. Internal taxonomy only — do not show to users.
 */
export function classifyOpenAiEmptyCompletion(params: {
  content: string | null | undefined;
  finishReason: string | null | undefined;
  reasoningTokens?: number | null;
  completionTokens?: number | null;
}): OpenAiEmptyClassification {
  const text = params.content?.trim() ?? "";
  if (text) return "ok";
  if (params.finishReason === "length") return "ai_budget_exhausted";
  const reasoning = params.reasoningTokens;
  const completion = params.completionTokens;
  if (
    reasoning != null &&
    completion != null &&
    completion > 0 &&
    reasoning >= completion
  ) {
    return "ai_budget_exhausted";
  }
  return "ai_empty";
}
