/**
 * Auto-generate the first daily plan after onboarding.
 * Uses the existing resilient routine generator — no new engine.
 */
import {
  enrichRoutinePayload,
  fetchRoutineWithResilience,
  RoutineGenerationPaywallError,
} from "@/lib/routine-generation-client";
import { trackConversionFunnel } from "@/lib/conversion-funnel";
import { markFirstRoutineActivated } from "@/lib/subscription-funnel-storage";

export const FIRST_PLAN_RETRY_PATH = "/dashboard?firstPlan=retry";
export const FIRST_PLAN_BUILDING_PATH = "/dashboard?firstPlan=building";

const LOCK_KEY = "amynest_first_plan_lock_v1";
const RESULT_KEY = "amynest_first_plan_result_v1";

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

type CachedResult = {
  routineId: number;
  date: string;
  childId: number;
};

function todayKey(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function readLock(): boolean {
  try {
    return sessionStorage.getItem(LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLock(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(LOCK_KEY, "1");
    else sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

function readCached(): CachedResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResult;
    if (parsed?.date !== todayKey() || !parsed.routineId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCached(result: CachedResult): void {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
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
  trackConversionFunnel(
    "first_value_achieved",
    {
      child_id: input.childId,
      routine_id: input.routineId,
      source: input.source ?? "first_plan_activation",
    },
    { onceKey: "auth-plan" },
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

function parseRoutines(body: unknown): Array<{ id: number; childId?: number; date?: string }> {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { routines?: unknown }).routines)
      ? (body as { routines: unknown[] }).routines
      : [];
  return rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      const date =
        typeof r.date === "string"
          ? r.date.slice(0, 10)
          : typeof r.routineDate === "string"
            ? r.routineDate.slice(0, 10)
            : "";
      return {
        id: typeof r.id === "number" ? r.id : 0,
        childId: typeof r.childId === "number" ? r.childId : undefined,
        date,
      };
    })
    .filter((r) => r.id > 0);
}

async function findTodayRoutine(
  authFetch: AuthFetchFn,
  childId: number,
  date: string,
): Promise<number | null> {
  try {
    const res = await authFetch(`/api/routines?childId=${childId}&date=${date}`);
    if (!res.ok) {
      const all = await authFetch("/api/routines");
      if (!all.ok) return null;
      const list = parseRoutines(await all.json());
      return list.find((r) => r.childId === childId && r.date === date)?.id ?? null;
    }
    const list = parseRoutines(await res.json());
    // API list ignores `date` query — always filter client-side.
    return (
      list.find((r) => r.date === date && (!r.childId || r.childId === childId))?.id ??
      null
    );
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
  const id = typeof body.id === "number" ? body.id : 0;
  if (!id) return { error: "missing_id" };
  return { id };
}

export async function activateFirstPlan(input: {
  authFetch: AuthFetchFn;
  childId?: number | null;
  childName?: string | null;
  source?: string;
}): Promise<FirstPlanActivationResult> {
  const date = todayKey();
  const cached = readCached();
  if (cached && (!input.childId || cached.childId === input.childId)) {
    return {
      status: "ready",
      routineId: cached.routineId,
      path: `/routines/${cached.routineId}?reveal=1`,
      reused: true,
    };
  }
  if (readLock()) {
    return { status: "failed", reason: "in_flight", retryable: true, path: FIRST_PLAN_BUILDING_PATH };
  }
  writeLock(true);

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

    const existing = await findTodayRoutine(input.authFetch, childId, date);
    if (existing) {
      writeCached({ routineId: existing, date, childId });
      markFirstRoutineActivated();
      emitFirstPlanReady({
        childId,
        routineId: existing,
        reused: true,
        source: input.source,
      });
      return {
        status: "ready",
        routineId: existing,
        path: `/routines/${existing}?reveal=1`,
        reused: true,
      };
    }

    const generated = await fetchRoutineWithResilience(
      input.authFetch,
      enrichRoutinePayload({ childId, date }),
      { childName: childName ?? undefined, source: input.source ?? "first_plan_activation" },
    );

    const items = Array.isArray(generated.items) ? generated.items : [];
    let saved = await persistRoutine(input.authFetch, {
      childId,
      date,
      title: generated.title,
      items,
      adaptations: generated.adaptations ?? undefined,
      override: false,
    });

    if ("conflictId" in saved) {
      // Reuse the existing same-day plan — never override:true. Auto-override
      // permanently wiped customized items when findTodayRoutine missed
      // (date-ignorant list race / transient GET failure) then POST hit 409.
      writeCached({ routineId: saved.conflictId, date, childId });
      markFirstRoutineActivated();
      emitFirstPlanReady({
        childId,
        routineId: saved.conflictId,
        reused: true,
        itemCount: items.length,
        source: input.source,
      });
      return {
        status: "ready",
        routineId: saved.conflictId,
        path: `/routines/${saved.conflictId}?reveal=1`,
        reused: true,
      };
    }

    if ("paywall" in saved) {
      const again = await findTodayRoutine(input.authFetch, childId, date);
      if (again) {
        writeCached({ routineId: again, date, childId });
        markFirstRoutineActivated();
        emitFirstPlanReady({
          childId,
          routineId: again,
          reused: true,
          source: input.source,
        });
        return {
          status: "ready",
          routineId: again,
          path: `/routines/${again}?reveal=1`,
          reused: true,
        };
      }
      return { status: "failed", reason: "paywall", retryable: false, path: FIRST_PLAN_RETRY_PATH };
    }

    if ("error" in saved) {
      return { status: "failed", reason: "unknown", retryable: true, path: FIRST_PLAN_RETRY_PATH };
    }

    writeCached({ routineId: saved.id, date, childId });
    markFirstRoutineActivated();
    emitFirstPlanReady({
      childId,
      routineId: saved.id,
      reused: false,
      itemCount: items.length,
      mode: generated.fallback ? "fallback" : "rule",
      source: input.source,
    });
    return {
      status: "ready",
      routineId: saved.id,
      path: `/routines/${saved.id}?reveal=1`,
      reused: false,
    };
  } catch (err) {
    if (err instanceof RoutineGenerationPaywallError) {
      return { status: "failed", reason: "paywall", retryable: false, path: FIRST_PLAN_RETRY_PATH };
    }
    return { status: "failed", reason: "network", retryable: true, path: FIRST_PLAN_RETRY_PATH };
  } finally {
    writeLock(false);
  }
}

export function peekFirstPlanPath(): string | null {
  const cached = readCached();
  return cached ? `/routines/${cached.routineId}?reveal=1` : null;
}
