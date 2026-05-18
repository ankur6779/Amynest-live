import { getApiUrl } from "@/lib/api";

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
  return typeof d.title === "string" && Array.isArray(d.items) && d.items.length > 0;
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
): Promise<RoutineGenerateResult> {
  return postRoutineEndpoint(authFetch, "/api/routines/generate", payload);
}

async function postRoutineEndpoint(
  authFetch: AuthFetchFn,
  path: string,
  payload: RoutineGeneratePayload,
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
    const errBody = body as { error?: string; fixedActivitiesResult?: unknown } | null;
    if (errBody?.error === "fixed_activity_blocking") {
      throw new RoutineGenerationFixedActivityError(errBody.fixedActivitiesResult ?? null);
    }
  }

  if (res.status === 402 || res.status === 403) {
    const errBody = body as { reason?: string; error?: string; feature?: string } | null;
    const isFeatureLocked =
      res.status === 402 &&
      (errBody?.error === "feature_locked" || errBody?.feature === "routine_generate");
    const isLegacyLimit = res.status === 403 && errBody?.reason === "routine_limit_exceeded";
    if (isFeatureLocked || isLegacyLimit) {
      throw new RoutineGenerationPaywallError();
    }
  }

  if (!res.ok) {
    throw new Error(`Routine generation failed (${res.status})`);
  }

  if (!isValidRoutine(body)) {
    throw new Error("Invalid or empty routine in response");
  }

  return body;
}

/**
 * Amy AI routine generation with retry, 8s standard-routine fallback, and logging.
 * Always resolves with a non-empty routine unless paywall / fixed-activity blocking.
 */
export async function fetchAmyAiRoutine(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
  options?: { onSlow?: () => void },
): Promise<RoutineGenerateResult> {
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
        if (attempt < MAX_AI_ATTEMPTS - 1) {
          logRoutineGen("retrying AI generation");
        }
      }
    }
    throw lastError ?? new Error("AI generation failed");
  };

  const standardAfterDelay = new Promise<RoutineGenerateResult>((resolve, reject) => {
    setTimeout(() => {
      options?.onSlow?.();
      logRoutineGen("8s elapsed — starting standard routine fallback");
      postRoutineEndpoint(authFetch, "/api/routines/generate", payload)
        .then(resolve)
        .catch(reject);
    }, SLOW_FALLBACK_MS);
  });

  try {
    return await Promise.race([runAiWithRetries(), standardAfterDelay]);
  } catch (raceErr) {
    if (
      raceErr instanceof RoutineGenerationPaywallError ||
      raceErr instanceof RoutineGenerationFixedActivityError
    ) {
      throw raceErr;
    }
    logRoutineGenError("race failed, final standard fallback", raceErr);
    return postRoutineEndpoint(authFetch, "/api/routines/generate", payload);
  }
}
