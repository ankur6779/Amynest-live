import type { AiRouteContract } from "./types.js";
import type { RoutineGeneratePollContext } from "../../routes/routines.js";

export const routineGenerateAiContract: AiRouteContract<
  RoutineGeneratePollContext,
  unknown,
  Record<string, unknown>
> = {
  routeName: "routines/generate-ai",
  jobType: "routines.generate",
  wave: 3,
  async finalize(worker, context) {
    const { buildRoutineGeneratePollResponse } = await import("../../routes/routines.js");
    return buildRoutineGeneratePollResponse(worker, context);
  },
};
