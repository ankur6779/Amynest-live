import type { AiJobType } from "../../queue/types.js";

export type AiRouteContract<TContext = unknown, TWorker = unknown, TApi = unknown> = {
  routeName: string;
  jobType: AiJobType;
  wave: 1 | 2 | 3;
  finalize: (worker: TWorker, context: TContext) => TApi | Promise<TApi>;
  afterFinalize?: (
    api: TApi,
    context: TContext,
    meta: { jobId: string; userId: string },
  ) => Promise<void>;
};

export type RegistryRouteName =
  | "speech/transcribe"
  | "ai/assistant-ai"
  | "infant-sleep/coach-plan"
  | "infant-feeding/plan"
  | "routines/generate-ai";
