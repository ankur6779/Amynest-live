import { track } from "@/lib/analytics";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";

export type RoutineGenerationMode =
  | "ai"
  | "standard"
  | "family"
  | "partial_regen"
  | "next_day";

export type RoutineGenerationAnalyticsContext = {
  childId?: number;
  mode: RoutineGenerationMode;
  source?: string;
};

type SessionFlags = {
  started: boolean;
  failed: boolean;
  generated: boolean;
};

let session: SessionFlags | null = null;

/** Begin a single analytics session per user generation attempt. */
export function beginRoutineGenerationSession(
  ctx: RoutineGenerationAnalyticsContext,
): void {
  session = { started: false, failed: false, generated: false };
  trackRoutineGenerationStarted(ctx);
}

export function endRoutineGenerationSession(): void {
  session = null;
}

function classifyRoutineError(err: unknown): {
  errorClass: string;
  statusCode?: number;
} {
  if (err instanceof Error) {
    if (err.name === "RoutineGenerationPaywallError") {
      return { errorClass: "paywall" };
    }
    if (err.name === "RoutineGenerationFixedActivityError") {
      return { errorClass: "fixed_activity_blocking" };
    }
  }
  const status = (err as { status?: number })?.status;
  const data = (err as { data?: { error?: string } })?.data;
  if (status === 429) return { errorClass: "rate_limit", statusCode: status };
  if (status === 504 || status === 502 || status === 503) {
    return { errorClass: "gateway_timeout", statusCode: status };
  }
  if (data?.error) return { errorClass: data.error, statusCode: status };
  if (status) return { errorClass: `http_${status}`, statusCode: status };
  return { errorClass: "unknown" };
}

export function trackRoutineGenerationStarted(
  ctx: RoutineGenerationAnalyticsContext,
): void {
  if (session?.started) return;
  if (session) session.started = true;
  track("routine_generation_started", {
    childId: ctx.childId,
    mode: ctx.mode,
    source: ctx.source,
  });
}

/** Emit when a routine is committed (saved) or returned without a separate save step. */
export function trackRoutineGeneratedOnce(input: {
  childId?: number;
  mode: "ai" | "rule" | "fallback";
  itemCount: number;
  source?: string;
  routineId?: number;
}): void {
  if (session?.generated) return;
  if (session) session.generated = true;
  track("routine_generated", {
    routineId: input.routineId,
    childId: input.childId,
    mode: input.mode,
    itemCount: input.itemCount,
    source: input.source,
  });
}

export function trackRoutineGenerationFailed(
  err: unknown,
  ctx: RoutineGenerationAnalyticsContext & { usedFallback?: boolean },
): void {
  if (session?.failed || session?.generated) return;
  if (session) session.failed = true;
  const { errorClass, statusCode } = classifyRoutineError(err);
  track("routine_generation_failed", {
    childId: ctx.childId,
    mode: ctx.mode,
    error_class: errorClass,
    status_code: statusCode,
    used_fallback: ctx.usedFallback,
    source: ctx.source,
  });
  getAnalyticsService().trackError("api", errorClass, {
    feature: "routine_generation",
    statusCode,
  });
}
