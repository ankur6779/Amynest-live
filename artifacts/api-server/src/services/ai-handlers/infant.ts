import { unwrapJobPayload } from "../../queue/ai-job-payload.js";
import type { InfantSleepCoachContext } from "../../lib/infant-sleep-prompts.js";

function isInfantSleepCoachContext(value: unknown): value is InfantSleepCoachContext {
  if (!value || typeof value !== "object") return false;
  const ctx = value as InfantSleepCoachContext;
  return (
    typeof ctx.childName === "string" &&
    typeof ctx.ageMonths === "number" &&
    Array.isArray(ctx.napSessions14d)
  );
}

function resolveInfantSleepCoachInput(unwrapped: {
  input: unknown;
  pollContext?: unknown;
}): {
  context: InfantSleepCoachContext;
  userId?: string;
  childId?: number;
} {
  const raw = (unwrapped.input ?? {}) as Record<string, unknown>;
  if (isInfantSleepCoachContext(raw.context)) {
    return {
      context: raw.context,
      userId: typeof raw.userId === "string" ? raw.userId : undefined,
      childId: typeof raw.childId === "number" ? raw.childId : undefined,
    };
  }

  const poll = unwrapped.pollContext as Record<string, unknown> | undefined;
  if (poll && isInfantSleepCoachContext(poll.context)) {
    return {
      context: poll.context,
      userId: typeof poll.userId === "string" ? poll.userId : undefined,
      childId: typeof poll.childId === "number" ? poll.childId : undefined,
    };
  }

  throw new Error("invalid_infant_sleep_context");
}

export async function handleInfantJob(
  type: string,
  payload: unknown,
): Promise<unknown> {
  const unwrapped = unwrapJobPayload(payload);
  switch (type) {
    case "infant.sleep_coach": {
      const { runInfantSleepCoach } = await import("../domain-ai/infant-sleep-runners.js");
      return runInfantSleepCoach(resolveInfantSleepCoachInput(unwrapped));
    }
    case "infant.feeding_plan": {
      const { runInfantFeedingPlan } = await import("../domain-ai/infant-feeding-runners.js");
      return runInfantFeedingPlan(unwrapped.input as Parameters<typeof runInfantFeedingPlan>[0]);
    }
    default:
      throw new Error(`unknown_infant_job:${type}`);
  }
}
