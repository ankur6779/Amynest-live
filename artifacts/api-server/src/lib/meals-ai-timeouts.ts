import { parseEnvMs } from "./env.js";

/** OpenAI abort budget for meals.ai_generate — must stay below worker budget. */
export const MEALS_AI_OPENAI_TIMEOUT_MS = parseEnvMs("MEALS_AI_OPENAI_TIMEOUT_MS", 40_000);

const MEALS_AI_WORKER_MARGIN_MS = parseEnvMs("MEALS_AI_WORKER_MARGIN_MS", 5_000);

const DEFAULT_AI_JOB_TIMEOUT_MS = 60_000;

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw.replace(/_/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Max completion tokens for meals.ai_generate JSON (5 meals + amyMessage). */
export const MEALS_AI_MAX_COMPLETION_TOKENS = parseEnvInt(
  "MEALS_AI_MAX_COMPLETION_TOKENS",
  1500,
);

/**
 * BullMQ worker race budget for meals.ai_generate.
 * Always >= OpenAI timeout + margin so post-processing can finish.
 */
export function getMealsAiWorkerTimeoutMs(): number {
  const openAiMs = MEALS_AI_OPENAI_TIMEOUT_MS;
  const explicit = parseEnvMs("MEALS_AI_WORKER_TIMEOUT_MS", 0);
  const jobDefault = parseEnvMs("AI_JOB_TIMEOUT_MS", DEFAULT_AI_JOB_TIMEOUT_MS);
  const base = explicit > 0 ? explicit : jobDefault;
  return Math.max(base, openAiMs + MEALS_AI_WORKER_MARGIN_MS);
}

/** @internal */
export function resetMealsAiTimeoutsForTests(): void {
  delete process.env.MEALS_AI_OPENAI_TIMEOUT_MS;
  delete process.env.MEALS_AI_WORKER_TIMEOUT_MS;
  delete process.env.MEALS_AI_WORKER_MARGIN_MS;
  delete process.env.AI_JOB_TIMEOUT_MS;
  delete process.env.MEALS_AI_MAX_COMPLETION_TOKENS;
}
