import type { Response } from "express";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import type { AiJobType } from "../queue/types.js";
import { submitAiJobAndRespond, type SubmitAiJobOptions } from "./ai-queue-http.js";

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
  });
}
