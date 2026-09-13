/**
 * Auto-generate the first daily plan after onboarding.
 * Uses the existing resilient routine generator — no new engine.
 */
import {
  enrichRoutinePayload,
  fetchRoutineWithResilience,
  RoutineGenerationPaywallError,
} from "@/lib/routine-generation-client";
import { localCalendarDateKey } from "@/lib/calendar-date";
import { trackConversionFunnel } from "@/lib/conversion-funnel";
import { markFirstRoutineActivated } from "@/lib/subscription-funnel-storage";
import {
  isExactChildDateRoutine,
  isExecutableTodayRoutine,
  persistedRoutineLocalDate,
} from "@/lib/today-home/today-plan";

export const FIRST_PLAN_RETRY_PATH = "/dashboard?firstPlan=retry";
export const FIRST_PLAN_BUILDING_PATH = "/dashboard?firstPlan=building";

const LOCK_KEY = "amynest_first_plan_lock_v1";
/** Scoped as todayPlan:{childId}:{localDate}. Legacy unscoped v1 is ignored. */
export const FIRST_PLAN_RESULT_KEY_PREFIX = "amynest_first_plan_result_v2";
const LEGACY_RESULT_KEY = "amynest_first_plan_result_v1";

type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

export type FirstPlanActivationOk = {
  status: "ready";
  routineId: number;
  path: string;
  reused: boolean;
};

export type FirstPlanActivationFail = {
  status: "failed";
  reason: "network" | "paywall" | "no_child" | "in_flight" | "unknown";
  retryable: boolean;
  path: string;
};

export type FirstPlanActivationResult = FirstPlanActivationOk | FirstPlanActivationFail;

export type CachedFirstPlanResult = {
  routineId: number;
  date: string;
  childId: number;
};

function todayKey(): string {
  return localCalendarDateKey();
}

export function firstPlanResultStorageKey(childId: number, date: string): string {
  return `${FIRST_PLAN_RESULT_KEY_PREFIX}:${childId}:${date}`;
}

function lockStorageKey(childId?: number | null): string {
  return childId != null ? `${LOCK_KEY}:${childId}` : LOCK_KEY;
}

function readLock(childId?: number | null): boolean {
  try {
    return sessionStorage.getItem(lockStorageKey(childId)) === "1";
  } catch {
    return false;
  }
}

function writeLock(on: boolean, childId?: number | null): void {
  try {
    const key = lockStorageKey(childId);
    if (on) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readFirstPlanCache(
  childId: number,
  date: string,
): CachedFirstPlanResult | null {
  try {
    const raw = sessionStorage.getItem(firstPlanResultStorageKey(childId, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFirstPlanResult;
    if (parsed?.childId !== childId || parsed?.date !== date || !parsed.routineId) {
      sessionStorage.removeItem(firstPlanResultStorageKey(childId, date));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeFirstPlanCache(result: CachedFirstPlanResult): void {
  if (result.childId <= 0 || !result.date || !result.routineId) return;
  try {
    sessionStorage.setItem(
      firstPlanResultStorageKey(result.childId, result.date),
      JSON.stringify(result),
    );
    sessionStorage.removeItem(LEGACY_RESULT_KEY);
  } catch {
    /* ignore */
  }
}

export function clearFirstPlanCache(childId: number, date: string): void {
  try {
    sessionStorage.removeItem(firstPlanResultStorageKey(childId, date));
    sessionStorage.removeItem(LEGACY_RESULT_KEY);
  } catch {
    /* ignore */
  }
}

function emitFirstPlanReady(input: {
  childId: number;
  routineId: number;
  reused: boolean;
  itemCount?: number;
  mode?: "ai" | "rule" | "fallback";
  source?: string;
}): void {
  trackConversionFunnel(
    "first_plan_generated",
    {
      child_id: input.childId,
      routine_id: input.routineId,
      reused: input.reused,
      item_count: input.itemCount,
      mode: input.mode,
      source: input.source ?? "first_plan_activation",
    },
    { onceKey: `plan-${input.routineId}` },
  );
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseChildren(body: unknown): Array<{ id: number; name?: string | null; age?: number | null }> {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { children?: unknown }).children)
      ? (body as { children: unknown[] }).children
      : [];
  return rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === "number" ? r.id : 0,
        name: typeof r.name === "string" ? r.name : null,
        age: typeof r.age === "number" ? r.age : null,
      };
    })
    .filter((c) => c.id > 0);
}

function parseRoutineRow(row: Record<string, unknown>): {
  id: number;
  childId?: number;
  date: string;
  items?: unknown[] | null;
} {
  const date = persistedRoutineLocalDate({
    date: typeof row.date === "string" ? row.date : null,
    routineDate: typeof row.routineDate === "string" ? row.routineDate : null,
  });
  return {
    id: typeof row.id === "number" ? row.id : 0,
    childId: typeof row.childId === "number" ? row.childId : undefined,
    date,
    items: Array.isArray(row.items) ? row.items : null,
  };
}

export function parseRoutines(body: unknown): Array<{
  id: number;
  childId?: number;
  date: string;
  items?: unknown[] | null;
}> {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { routines?: unknown }).routines)
      ? (body as { routines: unknown[] }).routines
      : [];
  return rows
    .map((row) => parseRoutineRow(row as Record<string, unknown>))
    .filter((r) => r.id > 0);
}

export function pickExactTodayRoutine(
  routines: Array<{ id: number; childId?: number; date?: string; items?: unknown[] | null }>,
  childId: number,
  date: string,
): number | null {
  const match = routines.find((routine) => isExecutableTodayRoutine(routine, childId, date));
  return match?.id ?? null;
}

export async function findTodayRoutine(
  authFetch: AuthFetchFn,
  childId: number,
  date: string,
): Promise<number | null> {
  try {
    const res = await authFetch(`/api/routines?childId=${childId}&date=${date}`);
    if (res.ok) {
      const exact = pickExactTodayRoutine(parseRoutines(await res.json()), childId, date);
      if (exact) return exact;
    }
    const all = await authFetch("/api/routines");
    if (!all.ok) return null;
    return pickExactTodayRoutine(parseRoutines(await all.json()), childId, date);
  } catch {
    return null;
  }
}

async function fetchVerifiedRoutine(
  authFetch: AuthFetchFn,
  routineId: number,
  childId: number,
  date: string,
): Promise<{ id: number; itemCount?: number } | null> {
  try {
    const res = await authFetch(`/api/routines/${routineId}`);
    if (!res.ok) return null;
    const row = parseRoutineRow(await readJson(res));
    if (!isExecutableTodayRoutine(row, childId, date)) return null;
    return {
      id: row.id,
      itemCount: Array.isArray(row.items) ? row.items.length : undefined,
    };
  } catch {
    return null;
  }
}

async function persistRoutine(
  authFetch: AuthFetchFn,
  payload: {
    childId: number;
    date: string;
    title: string;
    items: unknown[];
    adaptations?: string[] | null;
    override?: boolean;
  },
): Promise<{ id: number } | { conflictId: number } | { paywall: true } | { error: string }> {
  const res = await authFetch("/api/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readJson(res);
  if (res.status === 409 && typeof body.routineId === "number") {
    return { conflictId: body.routineId };
  }
  if (res.status === 402 || body.error === "routine_limit_reached" || body.error === "feature_locked") {
    return { paywall: true };
  }
  if (!res.ok) {
    return { error: typeof body.error === "string" ? body.error : `http_${res.status}` };
  }
  const created = parseRoutineRow(body);
  if (isExactChildDateRoutine(created, payload.childId, payload.date)) {
    return { id: created.id };
  }
  const id = typeof body.id === "number" ? body.id : 0;
  if (!id) return { error: "missing_id" };
  return { id };
}

async function acceptVerifiedTodayRoutine(input: {
  authFetch: AuthFetchFn;
  routineId: number;
  childId: number;
  date: string;
  reused: boolean;
  source?: string;
  itemCount?: number;
  mode?: "ai" | "rule" | "fallback";
}): Promise<FirstPlanActivationResult> {
  const verified = await fetchVerifiedRoutine(
    input.authFetch,
    input.routineId,
    input.childId,
    input.date,
  );
  if (!verified) {
    clearFirstPlanCache(input.childId, input.date);
    return { status: "failed", reason: "unknown", retryable: true, path: FIRST_PLAN_RETRY_PATH };
  }
  writeFirstPlanCache({
    routineId: verified.id,
    date: input.date,
    childId: input.childId,
  });
  markFirstRoutineActivated();
  emitFirstPlanReady({
    childId: input.childId,
    routineId: verified.id,
    reused: input.reused,
    itemCount: input.itemCount ?? verified.itemCount,
    mode: input.mode,
    source: input.source,
  });
  return {
    status: "ready",
    routineId: verified.id,
    path: `/routines/${verified.id}?reveal=1`,
    reused: input.reused,
  };
}

export async function activateFirstPlan(input: {
  authFetch: AuthFetchFn;
  childId?: number | null;
  childName?: string | null;
  source?: string;
}): Promise<FirstPlanActivationResult> {
  const date = todayKey();
  if (readLock(input.childId)) {
    return { status: "failed", reason: "in_flight", retryable: true, path: FIRST_PLAN_BUILDING_PATH };
  }
  writeLock(true, input.childId);

  try {
    let childId = input.childId ?? null;
    let childName = input.childName ?? null;
    if (!childId) {
      const res = await input.authFetch("/api/children");
      if (!res.ok) {
        return { status: "failed", reason: "network", retryable: true, path: FIRST_PLAN_RETRY_PATH };
      }
      const children = parseChildren(await res.json());
      childId = children[0]?.id ?? null;
      childName = childName ?? children[0]?.name ?? null;
    }
    if (!childId) {
      return { status: "failed", reason: "no_child", retryable: false, path: FIRST_PLAN_RETRY_PATH };
    }

    const cached = readFirstPlanCache(childId, date);
    if (cached) {
      const verifiedCache = await fetchVerifiedRoutine(input.authFetch, cached.routineId, childId, date);
      if (verifiedCache) {
        return acceptVerifiedTodayRoutine({
          authFetch: input.authFetch,
          routineId: verifiedCache.id,
          childId,
          date,
          reused: true,
          source: input.source,
          itemCount: verifiedCache.itemCount,
        });
      }
      clearFirstPlanCache(childId, date);
    }

    const existing = await findTodayRoutine(input.authFetch, childId, date);
    if (existing) {
      return acceptVerifiedTodayRoutine({
        authFetch: input.authFetch,
        routineId: existing,
        childId,
        date,
        reused: true,
        source: input.source,
      });
    }

    const generated = await fetchRoutineWithResilience(
      input.authFetch,
      enrichRoutinePayload({ childId, date }),
      { childName: childName ?? undefined, source: input.source ?? "first_plan_activation" },
    );

    const items = Array.isArray(generated.items) ? generated.items : [];
    if (items.length === 0) {
      return { status: "failed", reason: "unknown", retryable: true, path: FIRST_PLAN_RETRY_PATH };
    }

    let saved = await persistRoutine(input.authFetch, {
      childId,
      date,
      title: generated.title,
      items,
      adaptations: generated.adaptations ?? undefined,
      override: false,
    });

    if ("conflictId" in saved) {
      const conflict = await acceptVerifiedTodayRoutine({
        authFetch: input.authFetch,
        routineId: saved.conflictId,
        childId,
        date,
        reused: true,
        itemCount: items.length,
        source: input.source,
      });
      if (conflict.status === "ready") return conflict;
      saved = await persistRoutine(input.authFetch, {
        childId,
        date,
        title: generated.title,
        items,
        adaptations: generated.adaptations ?? undefined,
        override: true,
      });
    }

    if ("paywall" in saved) {
      const again = await findTodayRoutine(input.authFetch, childId, date);
      if (again) {
        return acceptVerifiedTodayRoutine({
          authFetch: input.authFetch,
          routineId: again,
          childId,
          date,
          reused: true,
          source: input.source,
        });
      }
      return { status: "failed", reason: "paywall", retryable: false, path: FIRST_PLAN_RETRY_PATH };
    }

    if ("error" in saved) {
      return { status: "failed", reason: "unknown", retryable: true, path: FIRST_PLAN_RETRY_PATH };
    }

    if ("conflictId" in saved) {
      return { status: "failed", reason: "unknown", retryable: true, path: FIRST_PLAN_RETRY_PATH };
    }

    return acceptVerifiedTodayRoutine({
      authFetch: input.authFetch,
      routineId: saved.id,
      childId,
      date,
      reused: false,
      itemCount: items.length,
      mode: generated.fallback ? "fallback" : "rule",
      source: input.source,
    });
  } catch (err) {
    if (err instanceof RoutineGenerationPaywallError) {
      return { status: "failed", reason: "paywall", retryable: false, path: FIRST_PLAN_RETRY_PATH };
    }
    return { status: "failed", reason: "network", retryable: true, path: FIRST_PLAN_RETRY_PATH };
  } finally {
    writeLock(false, input.childId);
    if (input.childId == null) writeLock(false);
  }
}

export function peekFirstPlanPath(childId?: number | null, date = todayKey()): string | null {
  if (childId == null) return null;
  const cached = readFirstPlanCache(childId, date);
  return cached ? `/routines/${cached.routineId}?reveal=1` : null;
}
