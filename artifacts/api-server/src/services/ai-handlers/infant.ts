import { unwrapJobPayload } from "../../queue/ai-job-payload.js";

export async function handleInfantJob(
  type: string,
  payload: unknown,
): Promise<unknown> {
  const { input } = unwrapJobPayload(payload);
  switch (type) {
    case "infant.sleep_coach": {
      const { runInfantSleepCoach } = await import("../domain-ai/infant-sleep-runners.js");
      return runInfantSleepCoach(input as Parameters<typeof runInfantSleepCoach>[0]);
    }
    case "infant.feeding_plan": {
      const { runInfantFeedingPlan } = await import("../domain-ai/infant-feeding-runners.js");
      return runInfantFeedingPlan(input as Parameters<typeof runInfantFeedingPlan>[0]);
    }
    default:
      throw new Error(`unknown_infant_job:${type}`);
  }
}
