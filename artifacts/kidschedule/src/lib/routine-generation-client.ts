import { getApiUrl } from "@/lib/api";
import { enqueueClientAi } from "@/lib/client-ai-queue";
import { reportFailedRoutine } from "@/lib/client-logs";
import { resolveAiApiData } from "@/lib/poll-result";
import { buildEmergencyRoutineFallback, sanitizeRoutineItems } from "@/lib/routine-item-safety";
import {
  beginRoutineGenerationSession,
  endRoutineGenerationSession,
  trackRoutineGenerationFailed,
  type RoutineGenerationMode,
} from "@/lib/routine-generation-analytics";

const LOG_TAG = "routine-gen";
const AI_FETCH_TIMEOUT_MS = 35_000;
const SLOW_FALLBACK_MS = 8_000;
const MAX_AI_ATTEMPTS = 2;

export type RoutineDayContext = {
  isWeekend: boolean;
  dayOfWeek: number;
  isToday: boolean;
};

export type RoutineGeneratePayload = {
  childId: number;
  date: string;
  userId?: string;
  timezone?: string;
  dayContext?: RoutineDayContext;
  hasSchool?: boolean;
  schoolMealMode?: string;
  specialPlans?: string;
  fixedActivities?: unknown;
  confirmBlockingFixedActivities?: boolean;
  fridgeItems?: string;
  mood?: string;
  age?: number;
  wakeTime?: string;
  schoolStart?: string;
  schoolEnd?: string;
  region?: string | null;
  caregiver?: string;
  weatherOutdoor?: string;
};

export type RoutineGenerateResult = {
  title: string;
  items: unknown[];
  adaptations?: string[] | null;
  fixedActivitiesResult?: unknown;
  success?: boolean;
  fallback?: boolean;
};

export class RoutineGenerationPaywallError extends Error {
  constructor() {
    super("routine_limit");
    this.name = "RoutineGenerationPaywallError";
  }
}

export class RoutineGenerationFixedActivityError extends Error {
  fixedActivitiesResult: unknown;
  constructor(fixedActivitiesResult: unknown) {
    super("fixed_activity_blocking");
    this.name = "RoutineGenerationFixedActivityError";
    this.fixedActivitiesResult = fixedActivitiesResult;
  }
}

type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

function logRoutineGen(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.info(`[${LOG_TAG}] ${message}`, detail);
  } else {
    console.info(`[${LOG_TAG}] ${message}`);
  }
}

function logRoutineGenError(message: string, error: unknown): void {
  console.error(`[${LOG_TAG}] ${message}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`[${LOG_TAG}] stack`, error.stack);
  }
}

function isValidRoutine(data: unknown): data is RoutineGenerateResult {
  if (!data || typeof data !== "object") return false;
  const d = data as RoutineGenerateResult;
  return typeof d.title === "string" && sanitizeRoutineItems(d.items).length > 0;
}

function normalizeRoutineResult(data: RoutineGenerateResult, fallback = false): RoutineGenerateResult {
  const items = sanitizeRoutineItems(data.items);
  return {
    ...data,
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Daily Routine",
    items,
    fallback: fallback || data.fallback === true,
  };
}

function buildClientEmergencyResult(childName?: string): RoutineGenerateResult {
  const items = buildEmergencyRoutineFallback(childName);
  return {
    title: "Backup daily routine",
    items,
    fallback: true,
    success: true,
  };
}

export function buildRoutineDayContext(date: string): RoutineDayContext {
  const d = new Date(date + "T00:00:00");
  const dayOfWeek = d.getDay();
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    dayOfWeek,
    isToday: date === todayKey,
  };
}

export function enrichRoutinePayload(
  base: Omit<RoutineGeneratePayload, "timezone" | "dayContext" | "userId">,
  userId?: string | null,
): RoutineGeneratePayload {
  return {
    ...base,
    userId: userId ?? undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayContext: buildRoutineDayContext(base.date),
  };
}

export async function fetchStandardRoutine(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
  options?: {
    source?: string;
    childName?: string;
    allowClientEmergency?: boolean;
    emitGeneratedOnSuccess?: boolean;
  },
): Promise<RoutineGenerateResult> {
  beginRoutineGenerationSession({
    childId: payload.childId,
    mode: "standard",
    source: options?.source,
  });
  try {
    const result = await postRoutineEndpoint(
      authFetch,
      "/api/routines/generate",
      payload,
    );
    if (options?.emitGeneratedOnSuccess) {
      const { trackRoutineGeneratedOnce } = await import("@/lib/routine-generation-analytics");
      trackRoutineGeneratedOnce({
        childId: payload.childId,
        mode: result.fallback ? "fallback" : "rule",
        itemCount: sanitizeRoutineItems(result.items).length,
        source: options.source,
      });
    }
    return result;
  } catch (err) {
    if (
      options?.allowClientEmergency &&
      !(err instanceof RoutineGenerationPaywallError) &&
      !(err instanceof RoutineGenerationFixedActivityError)
    ) {
      logRoutineGenError("standard generate failed — emergency client fallback", err);
      reportFailedRoutine(
        err instanceof Error ? err.message : "standard generation failed",
        "generate-standard-emergency",
      );
      return buildClientEmergencyResult(options.childName);
    }
    trackRoutineGenerationFailed(err, {
      childId: payload.childId,
      mode: "standard",
      source: options?.source,
    });
    throw err;
  } finally {
    endRoutineGenerationSession();
  }
}

async function postRoutineEndpoint(
  authFetch: AuthFetchFn,
  path: string,
  payload: RoutineGeneratePayload,
  options?: { markFallback?: boolean },
): Promise<RoutineGenerateResult> {
  const url = path.startsWith("/api/") ? getApiUrl(path) : path;
  logRoutineGen("request payload", { path, payload });

  const res = await authFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    AI_FETCH_TIMEOUT_MS,
  );

  let body: unknown = null;
  const raw = await res.text();
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch (parseErr) {
    logRoutineGenError("response JSON parse failed", parseErr);
  }

  logRoutineGen("API response", { path, status: res.status, body });

  if (res.status === 422) {
    const errBody = body as {
      error?: string;
      message?: string;
      fixedActivitiesResult?: unknown;
    } | null;
    if (errBody?.error === "fixed_activity_blocking") {
      throw new RoutineGenerationFixedActivityError(errBody.fixedActivitiesResult ?? null);
    }
    if (
      errBody?.error === "routine_validation_failed" ||
      errBody?.error === "partial_regenerate_unsupported_for_age"
    ) {
      throw new Error(
        errBody.message ?? "We couldn't build a safe routine right now. Please try again.",
      );
    }
  }

  if (res.status === 402 || res.status === 403) {
    const errBody = body as { reason?: string; error?: string; feature?: string } | null;
    const isFeatureLocked =
      res.status === 402 &&
      (errBody?.error === "feature_locked" ||
        errBody?.error === "routine_locked" ||
        errBody?.feature === "routine_generate");
    const isLegacyLimit = res.status === 403 && errBody?.reason === "routine_limit_exceeded";
    if (isFeatureLocked || isLegacyLimit) {
      throw new RoutineGenerationPaywallError();
    }
  }

  if (!res.ok) {
    const err = new Error(`Routine generation failed (${res.status})`) as Error & {
      status?: number;
      retryableWithStandard?: boolean;
    };
    err.status = res.status;
    const retryableStatuses = new Set([429, 500, 502, 503, 504]);
    if (retryableStatuses.has(res.status) && path.includes("generate-ai")) {
      err.retryableWithStandard = true;
    }
    throw err;
  }

  const resolved = await resolveAiApiData<RoutineGenerateResult>(body, authFetch);

  if (!isValidRoutine(resolved)) {
    const invalidErr = new Error("Invalid or empty routine in response") as Error & {
      retryableWithStandard?: boolean;
    };
    if (path.includes("generate-ai")) {
      invalidErr.retryableWithStandard = true;
    }
    throw invalidErr;
  }

  return normalizeRoutineResult(resolved, options?.markFallback === true);
}

/**
 * Amy AI routine generation with retry, 8s standard-routine fallback, and logging.
 * Resolves with a non-empty routine unless paywall / fixed-activity blocking.
 */
export async function fetchAmyAiRoutine(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
  options?: {
    onSlow?: () => void;
    userId?: string | null;
    source?: string;
    childName?: string;
    allowClientEmergency?: boolean;
  },
): Promise<RoutineGenerateResult> {
  const queueKey = options?.userId ?? payload.userId ?? "guest";

  const runQueued = (): Promise<RoutineGenerateResult> =>
    enqueueClientAi(queueKey, () => runAmyAiRoutineInner(authFetch, payload, options));

  return runQueued();
}

async function runAmyAiRoutineInner(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
  options?: {
    onSlow?: () => void;
    source?: string;
    childName?: string;
    allowClientEmergency?: boolean;
  },
): Promise<RoutineGenerateResult> {
  beginRoutineGenerationSession({
    childId: payload.childId,
    mode: "ai",
    source: options?.source,
  });

  let slowFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const cancelSlowFallback = () => {
    if (slowFallbackTimer !== null) {
      clearTimeout(slowFallbackTimer);
      slowFallbackTimer = null;
    }
  };

  const runStandardFallback = (label: string): Promise<RoutineGenerateResult> => {
    logRoutineGen(label);
    return postRoutineEndpoint(authFetch, "/api/routines/generate", payload, {
      markFallback: true,
    });
  };

  let standardFallbackPromise: Promise<RoutineGenerateResult> | null = null;
  const ensureStandardFallback = (label: string): Promise<RoutineGenerateResult> => {
    if (!standardFallbackPromise) {
      options?.onSlow?.();
      standardFallbackPromise = runStandardFallback(label);
    }
    return standardFallbackPromise;
  };

  const runAiWithRetries = async (): Promise<RoutineGenerateResult> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
      try {
        return await postRoutineEndpoint(authFetch, "/api/routines/generate-ai", payload);
      } catch (err) {
        lastError = err;
        if (
          err instanceof RoutineGenerationPaywallError ||
          err instanceof RoutineGenerationFixedActivityError
        ) {
          throw err;
        }
        logRoutineGenError(`AI attempt ${attempt + 1} failed`, err);
        if (
          err instanceof Error &&
          (err as Error & { retryableWithStandard?: boolean }).retryableWithStandard
        ) {
          logRoutineGen("AI gateway timeout — switching to standard routine immediately");
          return ensureStandardFallback("proxy timeout — starting standard routine fallback");
        }
        if (attempt < MAX_AI_ATTEMPTS - 1) {
          logRoutineGen("retrying AI generation");
        }
      }
    }
    reportFailedRoutine(
      lastError instanceof Error ? lastError.message : "AI generation failed",
      "generate-ai",
    );
    throw lastError ?? new Error("AI generation failed");
  };

  const standardAfterDelay = new Promise<RoutineGenerateResult>((resolve, reject) => {
    slowFallbackTimer = setTimeout(() => {
      slowFallbackTimer = null;
      if (settled) return;
      ensureStandardFallback("8s elapsed — starting standard routine fallback")
        .then((result) => {
          if (!settled) resolve(result);
        })
        .catch((err) => {
          if (!settled) reject(err);
        });
    }, SLOW_FALLBACK_MS);
  });

  try {
    const result = await Promise.race([runAiWithRetries(), standardAfterDelay]);
    settled = true;
    cancelSlowFallback();
    return result;
  } catch (raceErr) {
    settled = true;
    cancelSlowFallback();
    if (
      raceErr instanceof RoutineGenerationPaywallError ||
      raceErr instanceof RoutineGenerationFixedActivityError
    ) {
      trackRoutineGenerationFailed(raceErr, {
        childId: payload.childId,
        mode: "ai",
        source: options?.source,
      });
      throw raceErr;
    }
    logRoutineGenError("race failed, final standard fallback", raceErr);
    try {
      return await ensureStandardFallback("race failed — starting standard routine fallback");
    } catch (fallbackErr) {
      if (options?.allowClientEmergency) {
        logRoutineGenError("all server paths failed — emergency client fallback", fallbackErr);
        reportFailedRoutine(
          fallbackErr instanceof Error ? fallbackErr.message : "AI generation failed",
          "generate-ai-emergency",
        );
        return buildClientEmergencyResult(options.childName);
      }
      trackRoutineGenerationFailed(fallbackErr, {
        childId: payload.childId,
        mode: "ai",
        usedFallback: true,
        source: options?.source,
      });
      throw fallbackErr;
    }
  } finally {
    endRoutineGenerationSession();
  }
}

export type PersistGeneratedRoutineResult = {
  id: number;
  childId: number;
  date: string;
};

/**
 * Persist a generated routine via POST /api/routines (override replaces same child+date).
 */
export async function persistGeneratedRoutine(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    date: string;
    title: string;
    items: unknown[];
    adaptations?: string[] | null;
  },
): Promise<PersistGeneratedRoutineResult> {
  const res = await authFetch(
    getApiUrl("/api/routines"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: input.childId,
        date: input.date,
        title: input.title,
        items: sanitizeRoutineItems(input.items),
        adaptations: input.adaptations ?? undefined,
        override: true,
      }),
    },
    AI_FETCH_TIMEOUT_MS,
  );

  let body: unknown = null;
  const raw = await res.text();
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    /* ignore */
  }

  if (res.status === 402 || res.status === 403) {
    const errBody = body as { reason?: string; error?: string; feature?: string } | null;
    const isFeatureLocked =
      res.status === 402 &&
      (errBody?.error === "feature_locked" ||
        errBody?.error === "routine_locked" ||
        errBody?.feature === "routine_generate" ||
        errBody?.error === "routine_limit_reached");
    const isLegacyLimit = res.status === 403 && errBody?.reason === "routine_limit_exceeded";
    if (isFeatureLocked || isLegacyLimit) {
      throw new RoutineGenerationPaywallError();
    }
  }

  if (!res.ok) {
    const errBody = body as { message?: string } | null;
    throw new Error(errBody?.message ?? `Failed to save routine (${res.status})`);
  }

  const saved = body as { id?: number; childId?: number; date?: string };
  if (typeof saved?.id !== "number") {
    throw new Error("Save succeeded but routine id missing in response");
  }

  return {
    id: saved.id,
    childId: saved.childId ?? input.childId,
    date: saved.date ?? input.date,
  };
}

/**
 * Standard rule-based generation with optional client emergency routine.
 * Used when the server must return a persisted-ready payload (e.g. next-day).
 */
export async function fetchRoutineWithResilience(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
  options?: { childName?: string; source?: string },
): Promise<RoutineGenerateResult> {
  return fetchStandardRoutine(authFetch, payload, {
    source: options?.source,
    childName: options?.childName,
    allowClientEmergency: true,
    emitGeneratedOnSuccess: true,
  });
}
