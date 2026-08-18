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
