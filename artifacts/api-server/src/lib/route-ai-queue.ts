import type { Response } from "express";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import type { AiJobType } from "../queue/types.js";
import { submitAiJobAndRespond, type SubmitAiJobOptions } from "./ai-queue-http.js";

/** TTS enqueue burst — cache hits are cheap; generation has its own cost guard. */
const TTS_ENQUEUE_RATE_LIMIT = {
  windowMs: 60_000,
  maxPerWindow: Number(process.env.TTS_ENQUEUE_RATE_LIMIT_MAX ?? "120"),
};

function rateLimitOptionsForJobType(type: AiJobType): SubmitAiJobOptions["rateLimitOptions"] {
  if (type === "tts.synthesize" || type === "tts.pregenerate") {
    return TTS_ENQUEUE_RATE_LIMIT;
  }
  return undefined;
}

export type SubmitRouteAiJobOptions = Omit<SubmitAiJobOptions, "payload" | "type"> & {
  routeName: string;
  type: AiJobType;
  input: unknown;
  /** Serialized route context for GET /api/result poll shaping. */
  pollContext?: unknown;
};

/**
 * Enqueue AI for a named route. API never runs OpenAI/ElevenLabs — worker only.
 */
export async function submitRouteAiJob(opts: SubmitRouteAiJobOptions): Promise<void> {
  const wrapped = wrapJobInput(opts.routeName, opts.input, opts.pollContext);
  console.log("Enqueue:", opts.routeName);
  await submitAiJobAndRespond({
    ...opts,
    payload: wrapped,
    rateLimitOptions: opts.rateLimitOptions ?? rateLimitOptionsForJobType(opts.type),
  });
}
