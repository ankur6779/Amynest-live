/**
 * Amy Coach win-generation timeout stack — single source of truth.
 * Each layer MUST be >= the layer beneath it (OpenAI < Worker < Queue < Gateway < Client).
 *
 * OpenAI (30s) → Worker (45s) → Queue wait (50s) → Gateway (65s) → Client fetch (90s)
 */
export const COACH_OPENAI_TIMEOUT_MS = 30_000;
export const COACH_WORKER_TIMEOUT_MS = 45_000;
export const COACH_QUEUE_TIMEOUT_MS = 50_000;
export const COACH_GATEWAY_TIMEOUT_MS = 65_000;

/** Per poll GET during async generate (must be < client fetch budget). */
export const COACH_CLIENT_POLL_REQUEST_TIMEOUT_MS = 15_000;
export const COACH_CLIENT_POLL_INTERVAL_MS = 2_000;
/** Total poll budget — matches queue timeout. */
export const COACH_CLIENT_POLL_MAX_MS = COACH_QUEUE_TIMEOUT_MS;
export const COACH_CLIENT_FETCH_TIMEOUT_MS = 90_000;

/** Show “taking longer” copy after this elapsed time. */
export const COACH_CLIENT_SLOW_MESSAGE_MS = 15_000;

export const COACH_TIMEOUT_STACK = {
  openaiMs: COACH_OPENAI_TIMEOUT_MS,
  workerMs: COACH_WORKER_TIMEOUT_MS,
  queueMs: COACH_QUEUE_TIMEOUT_MS,
  gatewayMs: COACH_GATEWAY_TIMEOUT_MS,
  clientFetchMs: COACH_CLIENT_FETCH_TIMEOUT_MS,
} as const;
