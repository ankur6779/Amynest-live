const LOG_TAG = "routine-gen";
const SLOW_FALLBACK_MS = 8_000;
const MAX_AI_ATTEMPTS = 2;

export type RoutineDayContext = {
  isWeekend: boolean;
  dayOfWeek: number;
  isToday: boolean;
};

export type RoutineGeneratePayload = Record<string, unknown> & {
  childId: number;
  date: string;
  userId?: string;
  timezone?: string;
  dayContext?: RoutineDayContext;
};

export type RoutineGenerateResult = {
  title: string;
  items: unknown[];
  adaptations?: string[] | null;
  success?: boolean;
  fallback?: boolean;
};

export class RoutineGenerationPaywallError extends Error {
  constructor() {
    super("routine_limit");
    this.name = "RoutineGenerationPaywallError";
  }
}

type AuthFetchFn = (path: string, init?: RequestInit) => Promise<Response>;

function logRoutineGen(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.info(`[${LOG_TAG}] ${message}`, detail);
  } else {
    console.info(`[${LOG_TAG}] ${message}`);
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
  base: Record<string, unknown>,
  userId?: string | null,
): RoutineGeneratePayload {
  const date = String(base.date ?? "");
  return {
    ...base,
    userId: userId ?? undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayContext: buildRoutineDayContext(date),
  } as RoutineGeneratePayload;
}

async function postRoutineEndpoint(
  authFetch: AuthFetchFn,
  path: string,
  payload: RoutineGeneratePayload,
): Promise<RoutineGenerateResult> {
  logRoutineGen("request payload", { path, payload });
  const res = await authFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as unknown;
  logRoutineGen("API response", { path, status: res.status, body });

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

export async function fetchStandardRoutine(
  authFetch: AuthFetchFn,
  payload: RoutineGeneratePayload,
): Promise<RoutineGenerateResult> {
  return postRoutineEndpoint(authFetch, "/api/routines/generate", payload);
}

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
        if (err instanceof RoutineGenerationPaywallError) throw err;
        console.error(`[${LOG_TAG}] AI attempt ${attempt + 1} failed`, err);
      }
    }
    throw lastError ?? new Error("AI generation failed");
  };

  const standardAfterDelay = new Promise<RoutineGenerateResult>((resolve, reject) => {
    setTimeout(() => {
      options?.onSlow?.();
      postRoutineEndpoint(authFetch, "/api/routines/generate", payload)
        .then(resolve)
        .catch(reject);
    }, SLOW_FALLBACK_MS);
  });

  try {
    return await Promise.race([runAiWithRetries(), standardAfterDelay]);
  } catch (raceErr) {
    if (raceErr instanceof RoutineGenerationPaywallError) throw raceErr;
    return fetchStandardRoutine(authFetch, payload);
  }
}
