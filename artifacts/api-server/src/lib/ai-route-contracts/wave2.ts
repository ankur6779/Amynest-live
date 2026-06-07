import type { InfantSleepCoachPlan } from "../infant-sleep-prompts.js";
import type { InfantFeedingPlan } from "../infant-feeding-prompts.js";
import type { AiRouteContract } from "./types.js";

export type InfantSleepContext = {
  userId: string;
  childId: number;
  context: unknown;
  ageMonths?: number;
};

export type InfantSleepWorker = { plan: InfantSleepCoachPlan };

export const infantSleepCoachContract: AiRouteContract<
  InfantSleepContext,
  InfantSleepWorker,
  { ok: true; plan: InfantSleepCoachPlan; generatedAt: string; cached: false }
> = {
  routeName: "infant-sleep/coach-plan",
  jobType: "infant.sleep_coach",
  wave: 2,
  finalize(worker) {
    return {
      ok: true,
      plan: worker.plan,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  },
  async afterFinalize(_api, ctx) {
    const { persistInfantSleepCoachPlan } = await import("../../routes/infant-sleep-coach.js");
    await persistInfantSleepCoachPlan(ctx.userId, ctx.childId, ctx.context, _api.plan);
  },
};

export type InfantFeedingContext = InfantSleepContext;

export type InfantFeedingWorker = { plan: InfantFeedingPlan };

export const infantFeedingPlanContract: AiRouteContract<
  InfantFeedingContext,
  InfantFeedingWorker,
  { ok: true; plan: InfantFeedingPlan; generatedAt: string; cached: false }
> = {
  routeName: "infant-feeding/plan",
  jobType: "infant.feeding_plan",
  wave: 2,
  finalize(worker) {
    return {
      ok: true,
      plan: worker.plan,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  },
  async afterFinalize(_api, ctx) {
    const { persistInfantFeedingPlan } = await import("../../routes/infant-feeding-plan.js");
    await persistInfantFeedingPlan(ctx.userId, ctx.childId, ctx.context, _api.plan, ctx.ageMonths);
  },
};
