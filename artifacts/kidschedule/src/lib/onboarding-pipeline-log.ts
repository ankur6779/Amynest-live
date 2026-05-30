import type { AuthFetchFn } from "@/lib/setup-status";
import { readOnboardingCache } from "@/lib/setup-status";
import { buildOnboardingTelemetryPayload } from "@/lib/onboarding-telemetry";

export type OnboardingPipelinePhase =
  | "finish-button-click"
  | "save-everything-start"
  | "save-everything-after-transaction"
  | "save-everything-after-cache"
  | "save-everything-failed"
  | "go-dashboard-start"
  | "go-dashboard-end"
  | "bootstrap-after-reload"
  | "route-guard-check";

export interface OnboardingPipelineSnapshot {
  phase: OnboardingPipelinePhase;
  userId: string | null;
  /** AmyNest is user-scoped — no separate family row; same as userId when signed in. */
  familyId: string | null;
  childId: number | null;
  childIds: number[];
  onboardingComplete: boolean;
  profileComplete: boolean;
  localOnboardingComplete: boolean;
  localProfileComplete: boolean;
  apiOnboardingComplete: boolean | null;
  apiProfileComplete: boolean | null;
  apiFallback: boolean | null;
  onboardingRunId: string | null;
  route: string | undefined;
  error?: string;
  extra?: Record<string, unknown>;
}

async function fetchApiOnboardingState(
  authFetch: AuthFetchFn,
): Promise<{
  onboardingComplete: boolean | null;
  profileComplete: boolean | null;
  fallback: boolean | null;
  childIds: number[];
  childId: number | null;
}> {
  let onboardingComplete: boolean | null = null;
  let profileComplete: boolean | null = null;
  let fallback: boolean | null = null;
  const childIds: number[] = [];

  try {
    const res = await authFetch("/api/onboarding");
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    fallback = body.fallback === true ? true : res.ok ? false : null;
    onboardingComplete =
      typeof body.onboardingComplete === "boolean" ? body.onboardingComplete : null;
    profileComplete =
      typeof body.profileComplete === "boolean" ? body.profileComplete : null;
  } catch {
    /* network */
  }

  try {
    const res = await authFetch("/api/children");
    if (res.ok) {
      const rows = (await res.json()) as unknown;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const id = (row as { id?: unknown }).id;
          if (typeof id === "number" && id > 0) childIds.push(id);
        }
      }
    }
  } catch {
    /* network */
  }

  return {
    onboardingComplete,
    profileComplete,
    fallback,
    childIds,
    childId: childIds[0] ?? null,
  };
}

/** Structured snapshot for every step of the onboarding completion pipeline. */
export async function logOnboardingPipelineSnapshot(
  phase: OnboardingPipelinePhase,
  authFetch: AuthFetchFn,
  opts: {
    userId?: string | null;
    onboardingRunId?: string | null;
    error?: string;
    extra?: Record<string, unknown>;
    skipApiFetch?: boolean;
  } = {},
): Promise<OnboardingPipelineSnapshot> {
  const cached = readOnboardingCache();
  const userId = opts.userId ?? null;

  let api = {
    onboardingComplete: null as boolean | null,
    profileComplete: null as boolean | null,
    fallback: null as boolean | null,
    childIds: [] as number[],
    childId: null as number | null,
  };

  if (!opts.skipApiFetch && userId) {
    api = await fetchApiOnboardingState(authFetch);
  }

  const snapshot: OnboardingPipelineSnapshot = {
    phase,
    userId,
    familyId: userId,
    childId: api.childId,
    childIds: api.childIds,
    onboardingComplete:
      cached.onboardingComplete ||
      cached.profileComplete ||
      api.onboardingComplete === true ||
      api.profileComplete === true,
    profileComplete:
      cached.profileComplete ||
      api.profileComplete === true,
    localOnboardingComplete: cached.onboardingComplete,
    localProfileComplete: cached.profileComplete,
    apiOnboardingComplete: api.onboardingComplete,
    apiProfileComplete: api.profileComplete,
    apiFallback: api.fallback,
    onboardingRunId: opts.onboardingRunId ?? null,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    error: opts.error,
    extra: opts.extra,
  };

  console.info(
    `[onboarding-pipeline] ${phase}`,
    buildOnboardingTelemetryPayload(snapshot as unknown as Record<string, unknown>, {
      userId,
    }),
  );

  return snapshot;
}
