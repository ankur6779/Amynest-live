import { randomUUID } from "crypto";
import {
  COACH_INITIAL_WINS,
  COACH_TOTAL_WINS,
  staticInitialWinsFallback,
  validatePartialPlan,
  type CoachInput,
  type CoachPlan,
} from "../services/coachWinGenerationService.js";
import {
  recordCoachGenerateAttempt,
  recordCoachObservabilityEvent,
} from "../services/coachObservabilityService.js";
import { logger } from "./logger.js";

export type CoachGeneratePollContext = {
  userId: string;
  sessionId: string;
  goal: string;
  goalLabel: string;
  input: CoachInput;
  cacheKey: string;
  traceId?: string;
};

export type CoachGenerateApiBody = {
  plan: CoachPlan;
  wins: CoachPlan["wins"];
  status: "partial";
  totalWins: number;
  initialWins: number;
  sessionId: string;
  planCacheKey: string;
  cached: false;
  source: "ai" | "fallback" | "emergency";
  fallback: boolean;
  lazyWins: true;
};

/** Layer 4 — always succeeds without DB or OpenAI. */
export function buildEmergencyCoachInitialPlan(goalLabel: string, input: CoachInput): CoachPlan {
  return staticInitialWinsFallback(goalLabel, input);
}

function parseWorkerPlan(rawResult: unknown): { plan: CoachPlan; aiOk: boolean } | null {
  if (!rawResult || typeof rawResult !== "object") return null;
  const row = rawResult as { raw?: string; aiOk?: boolean };
  const raw = row.raw;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (validatePartialPlan(parsed)) {
      return { plan: parsed, aiOk: row.aiOk === true };
    }
  } catch {
    /* invalid JSON from worker */
  }
  return null;
}

/**
 * Multi-layer fallback: AI → goal library → emergency.
 * Always returns a valid partial plan (2 wins).
 */
export function buildCoachGenerateApiBody(
  rawResult: unknown,
  ctx: CoachGeneratePollContext,
  opts?: { failureReason?: string; skipTelemetry?: boolean },
): CoachGenerateApiBody {
  const parsed = parseWorkerPlan(rawResult);
  let plan: CoachPlan;
  let source: CoachGenerateApiBody["source"] = "emergency";

  if (parsed) {
    plan = parsed.plan;
    source = parsed.aiOk ? "ai" : "fallback";
  } else {
    plan = staticInitialWinsFallback(ctx.goalLabel, ctx.input);
    source = opts?.failureReason ? "emergency" : "fallback";
    if (!opts?.skipTelemetry) {
      recordCoachObservabilityEvent("coach_fallback_used", {
        goal: ctx.goal,
        phase: "initial",
        reason: opts?.failureReason ?? "validation_failed",
      });
    }
  }

  if (!opts?.skipTelemetry) {
    recordCoachGenerateAttempt(
      source === "ai" ? "ai" : source === "emergency" ? "emergency" : "fallback",
    );
  }

  return {
    plan,
    wins: plan.wins,
    status: "partial",
    totalWins: COACH_TOTAL_WINS,
    initialWins: COACH_INITIAL_WINS,
    sessionId: ctx.sessionId,
    planCacheKey: ctx.cacheKey,
    cached: false,
    source,
    fallback: source !== "ai",
    lazyWins: true,
  };
}

export async function runCoachGenerateSideEffects(
  body: CoachGenerateApiBody,
  ctx: CoachGeneratePollContext,
): Promise<void> {
  try {
    const { saveCoachSession } = await import("../services/coachSessionService.js");
    await saveCoachSession(ctx.userId, ctx.sessionId, ctx.goal, body.plan, ctx.input);
    const { recordCoachPlanCompleted } = await import("../services/coachJourneyService.js");
    await recordCoachPlanCompleted(ctx.userId, ctx.goal, ctx.sessionId);
  } catch (err) {
    logger.warn(
      { err, sessionId: ctx.sessionId, userId: ctx.userId },
      "coach generate side effects failed (non-fatal)",
    );
  }
}

export function newCoachGeneratePollContext(
  userId: string,
  goal: string,
  goalLabel: string,
  input: CoachInput,
  cacheKey: string,
  traceId?: string,
): CoachGeneratePollContext {
  return {
    userId,
    sessionId: randomUUID(),
    goal,
    goalLabel,
    input,
    cacheKey,
    traceId,
  };
}

/** Worker-level emergency completion when OpenAI/queue races time out. */
export async function buildCoachWorkerFallbackResult(
  jobType: string,
  payload: unknown,
): Promise<{ raw: string } | null> {
  const { unwrapJobPayload } = await import("../queue/ai-job-payload.js");
  const wrapped = unwrapJobPayload(payload);
  const ctx = wrapped.pollContext as CoachGeneratePollContext | undefined;
  if (jobType === "ai-coach.initial_wins" && ctx?.goalLabel && ctx.input) {
    const plan = buildEmergencyCoachInitialPlan(ctx.goalLabel, ctx.input);
    recordCoachObservabilityEvent("coach_emergency_fallback", {
      goal: ctx.goal,
      reason: "worker_timeout",
    });
    return { raw: JSON.stringify(plan) };
  }
  return null;
}
