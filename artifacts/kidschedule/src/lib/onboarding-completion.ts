import { parseApiJson } from "@/lib/safe-json-response";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";
import { trackOnboardingError } from "@/lib/onboarding-analytics";
import {
  buildOnboardingTelemetryPayload,
  getOnboardingRunId,
} from "@/lib/onboarding-telemetry";
import type { AuthFetchFn, SetupStatus } from "@/lib/setup-status";

/** Structured onboarding finish telemetry (production-safe). */
export type OnboardingFinishLogEvent =
  | "ONBOARDING_FINISH_STARTED"
  | "ONBOARDING_FINISH_SUCCESS"
  | "ONBOARDING_FINISH_FAILED"
  | "PROFILE_SAVE_SUCCESS"
  | "PROFILE_SAVE_FAILED"
  | "COMPLETION_FLAG_WRITE_SUCCESS"
  | "COMPLETION_FLAG_WRITE_FAILED"
  | "SERVER_COMPLETE_LOCAL_INCOMPLETE_REPAIRED"
  | "BOOTSTRAP_ONBOARDING_DECISION"
  | "APP_CRASH";

export function logOnboardingFinish(
  event: OnboardingFinishLogEvent,
  payload: Record<string, unknown>,
  opts?: { userId?: string | null; step?: string },
): void {
  console.log(
    `[onboarding-finish] ${event}`,
    buildOnboardingTelemetryPayload(payload, opts),
  );
}

export type ParentProfileSnapshot = {
  name?: string | null;
  role?: string | null;
  workType?: string | null;
  dietType?: string | null;
  foodStyle?: string | null;
  region?: string | null;
  focusAreas?: string[] | null;
};

export type ChildSnapshot = {
  id?: number;
  name?: string | null;
};

export type OnboardingFinishPayload = {
  parent: Record<string, unknown>;
  children: Array<Record<string, unknown>>;
  onboardingMeta: {
    children: Array<{ name: string; ageGroup: string; problems: string[] }>;
    parent: Record<string, unknown>;
    priorityGoal: string;
  };
  selectedParentGoals: string[];
  userId?: string | null;
  onboardingRunId?: string;
};

const STANDARD_PROGRESS_STEPS: OnboardingStep[] = [
  "country-confirm",
  "child-name",
  "child-dob",
  "child-birthday",
  "child-education-stage",
  "child-class-grade",
  "child-schedule-known",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-allergies",
];

const INFANT_PROGRESS_STEPS: OnboardingStep[] = [
  "country-confirm",
  "child-name",
  "child-dob",
  "child-birthday",
  "infant-feeding",
  "infant-sleep",
  "child-education-stage",
  "child-wake",
  "child-sleep",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-allergies",
];

const TERMINAL_STEPS = new Set<OnboardingStep>([
  "parent-allergies",
  "saving",
  "done",
  "notifications",
]);

export function computeOnboardingProgressPercent(step: OnboardingStep): number {
  if (TERMINAL_STEPS.has(step)) return 100;
  const orders = [STANDARD_PROGRESS_STEPS, INFANT_PROGRESS_STEPS];
  for (const order of orders) {
    const idx = order.indexOf(step);
    if (idx >= 0) {
      return Math.round(((idx + 1) / order.length) * 100);
    }
  }
  return 0;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function inferOnboardingCompleteFromProfile(
  parent: ParentProfileSnapshot | null | undefined,
  children: ChildSnapshot[] | null | undefined,
  progressPercent = 100,
): boolean {
  if (progressPercent < 100) return false;
  if (!Array.isArray(children) || children.length === 0) return false;
  if (!parent) return false;

  const hasChild = children.some((c) => hasText(c.name));
  const hasOccupation = hasText(parent.workType);
  const hasDiet = hasText(parent.dietType);
  const hasFoodStyle = hasText(parent.foodStyle);
  const hasFocus =
    Array.isArray(parent.focusAreas) && parent.focusAreas.length > 0;

  return (
    hasChild &&
    hasOccupation &&
    hasDiet &&
    hasFoodStyle &&
    (hasFocus || progressPercent >= 100)
  );
}

export function mergeSetupStatusPreferComplete(
  cached: SetupStatus | undefined,
  remote: SetupStatus | undefined,
): SetupStatus {
  const local = cached ?? { onboardingComplete: false, profileComplete: false };
  const server = remote ?? { onboardingComplete: false, profileComplete: false };
  if (isSetupComplete(server)) return server;
  if (isSetupComplete(local)) return local;
  return server;
}

function isSetupComplete(data: SetupStatus | undefined): boolean {
  if (!data) return false;
  return data.onboardingComplete || data.profileComplete;
}

async function readJsonBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const data = (await parseApiJson<unknown>(res));
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function isFallbackBody(body: Record<string, unknown>): boolean {
  return body.fallback === true;
}

function isServerComplete(body: Record<string, unknown>): boolean {
  return body.onboardingComplete === true || body.profileComplete === true;
}

export class OnboardingFinishError extends Error {
  readonly step: string;
  readonly kind: "validation" | "save";

  constructor(step: string, message: string, kind: "validation" | "save" = "save") {
    super(message);
    this.name = "OnboardingFinishError";
    this.step = step;
    this.kind = kind;
  }
}

async function fetchExistingChildren(
  authFetch: AuthFetchFn,
): Promise<Array<{ id: number; name: string | null }>> {
  const res = await authFetch("/api/children");
  if (!res.ok) return [];
  const body = (await parseApiJson<unknown>(res));
  if (!Array.isArray(body)) return [];
  return body
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === "number" ? r.id : 0,
        name: typeof r.name === "string" ? r.name : null,
      };
    })
    .filter((c) => c.id > 0);
}

/**
 * Atomic onboarding finish. Local completion flags are written only by the caller
 * after this resolves. Idempotent when server already reports complete.
 */
export async function runOnboardingFinishTransaction(
  authFetch: AuthFetchFn,
  payload: OnboardingFinishPayload,
): Promise<{ alreadyCompleted?: boolean }> {
  const telemetryOpts = {
    userId: payload.userId ?? null,
    step: "saving",
  };

  logOnboardingFinish(
    "ONBOARDING_FINISH_STARTED",
    {
      onboardingRunId: payload.onboardingRunId ?? getOnboardingRunId(),
      childCount: payload.children.length,
      goalCount: payload.selectedParentGoals.length,
    },
    telemetryOpts,
  );

  try {
    const statusRes = await authFetch("/api/onboarding");
    const statusBody = await readJsonBody(statusRes);
    if (
      statusRes.ok &&
      !isFallbackBody(statusBody) &&
      isServerComplete(statusBody)
    ) {
      logOnboardingFinish(
        "ONBOARDING_FINISH_SUCCESS",
        { alreadyCompleted: true, skippedWrites: true },
        telemetryOpts,
      );
      return { alreadyCompleted: true };
    }

    const parentRes = await authFetch("/api/parent-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.parent),
    });
    const parentBody = await readJsonBody(parentRes);
    if (!parentRes.ok || isFallbackBody(parentBody)) {
      logOnboardingFinish(
        "PROFILE_SAVE_FAILED",
        { status: parentRes.status, fallback: parentBody.fallback === true, body: parentBody },
        telemetryOpts,
      );
      if (parentRes.status === 400) {
        trackOnboardingError("onboarding_validation_failed", {
          step: "parent-profile",
          status: parentRes.status,
          message: typeof parentBody.error === "string" ? parentBody.error : "validation_failed",
        });
      }
      throw new OnboardingFinishError(
        "parent-profile",
        `Parent profile save failed (HTTP ${parentRes.status})`,
        parentRes.status === 400 ? "validation" : "save",
      );
    }
    logOnboardingFinish("PROFILE_SAVE_SUCCESS", { status: parentRes.status }, telemetryOpts);

    const existingChildren = await fetchExistingChildren(authFetch);
    let savedChildCount = existingChildren.length;

    for (const child of payload.children) {
      const childName = typeof child.name === "string" ? child.name : "";
      const existing = existingChildren.find(
        (c) => c.name?.toLowerCase() === childName.toLowerCase(),
      );
      let childId = existing?.id ?? null;

      if (!existing) {
        const res = await authFetch("/api/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(child),
        });
        const body = await readJsonBody(res);
        if (!res.ok || isFallbackBody(body)) {
          logOnboardingFinish(
            "ONBOARDING_FINISH_FAILED",
            {
              step: "child-save",
              childName,
              status: res.status,
              fallback: body.fallback === true,
            },
            telemetryOpts,
          );
          if (res.status === 400) {
            trackOnboardingError("onboarding_validation_failed", {
              step: "child-save",
              childName,
              status: res.status,
              message: typeof body.error === "string" ? body.error : "validation_failed",
            });
          } else {
            trackOnboardingError("onboarding_save_failed", {
              step: "child-save",
              childName,
              status: res.status,
              fallback: body.fallback === true,
            });
          }
          continue;
        }
        savedChildCount += 1;
        childId = typeof body.id === "number" ? body.id : null;
      }

      if (childId && payload.selectedParentGoals.length > 0) {
        const goalsRes = await authFetch(`/api/child-intelligence/${childId}/goals`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentGoals: payload.selectedParentGoals }),
        });
        if (!goalsRes.ok) {
          logOnboardingFinish(
            "ONBOARDING_FINISH_FAILED",
            { step: "child-goals", childId, status: goalsRes.status },
            telemetryOpts,
          );
        }
      }
    }

    if (savedChildCount === 0) {
      throw new OnboardingFinishError(
        "child-save",
        "No child profiles were saved — cannot complete onboarding",
      );
    }

    const onboardingRes = await authFetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload.onboardingMeta,
        onboardingComplete: true,
      }),
    });
    const onboardingBody = await readJsonBody(onboardingRes);
    const flaggedComplete =
      onboardingBody.onboardingComplete === true ||
      onboardingBody.success === true ||
      onboardingBody.alreadyCompleted === true;

    if (!onboardingRes.ok || isFallbackBody(onboardingBody) || !flaggedComplete) {
      logOnboardingFinish(
        "COMPLETION_FLAG_WRITE_FAILED",
        {
          status: onboardingRes.status,
          fallback: onboardingBody.fallback === true,
          body: onboardingBody,
        },
        telemetryOpts,
      );
      throw new OnboardingFinishError(
        "onboarding-flag",
        "Server did not confirm onboarding completion",
      );
    }

    const verifyRes = await authFetch("/api/onboarding");
    const verifyBody = await readJsonBody(verifyRes);
    const verified =
      verifyRes.ok &&
      !isFallbackBody(verifyBody) &&
      isServerComplete(verifyBody);

    if (!verified) {
      const childrenRes = await authFetch("/api/children");
      const childrenBody = await readJsonBody(childrenRes);
      const children = Array.isArray(childrenBody) ? childrenBody : [];
      if (children.length === 0) {
        throw new OnboardingFinishError(
          "verify",
          "Completion could not be verified after save",
        );
      }
    }

    logOnboardingFinish(
      "COMPLETION_FLAG_WRITE_SUCCESS",
      {
        verified,
        alreadyCompleted: onboardingBody.alreadyCompleted === true,
        savedChildCount,
        onboardingPostStatus: onboardingRes.status,
        onboardingPostBody: onboardingBody,
      },
      telemetryOpts,
    );
    logOnboardingFinish(
      "ONBOARDING_FINISH_SUCCESS",
      {
        savedChildCount,
        alreadyCompleted: onboardingBody.alreadyCompleted === true,
      },
      telemetryOpts,
    );
    return {
      alreadyCompleted: onboardingBody.alreadyCompleted === true,
    };
  } catch (err) {
    if (err instanceof OnboardingFinishError) {
      if (err.kind === "validation") {
        /* onboarding_validation_failed emitted at the HTTP 400 site */
      } else {
        trackOnboardingError("onboarding_save_failed", {
          step: err.step,
          message: err.message,
        });
      }
    } else {
      logOnboardingFinish(
        "ONBOARDING_FINISH_FAILED",
        {
          step: "unexpected",
          message: err instanceof Error ? err.message : String(err),
        },
        telemetryOpts,
      );
      trackOnboardingError("onboarding_save_failed", {
        step: "unexpected",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
}

export async function fetchProfileCompletionSignals(
  authFetch: AuthFetchFn,
): Promise<{
  parent: ParentProfileSnapshot | null;
  children: ChildSnapshot[];
}> {
  let parent: ParentProfileSnapshot | null = null;
  let children: ChildSnapshot[] = [];

  try {
    const parentRes = await authFetch("/api/parent-profile");
    if (parentRes.ok) {
      const body = await readJsonBody(parentRes);
      if (!isFallbackBody(body)) {
        parent = {
          name: typeof body.name === "string" ? body.name : null,
          role: typeof body.role === "string" ? body.role : null,
          workType: typeof body.workType === "string" ? body.workType : null,
          dietType: typeof body.dietType === "string" ? body.dietType : null,
          foodStyle: typeof body.foodStyle === "string" ? body.foodStyle : null,
          region: typeof body.region === "string" ? body.region : null,
          focusAreas: null,
        };
      }
    }
  } catch {
    /* best-effort */
  }

  try {
    const childrenRes = await authFetch("/api/children");
    if (childrenRes.ok) {
      const body = (await parseApiJson<unknown>(childrenRes));
      if (Array.isArray(body)) {
        children = body.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            id: typeof r.id === "number" ? r.id : undefined,
            name: typeof r.name === "string" ? r.name : null,
          };
        });
      }
    }
  } catch {
    /* best-effort */
  }

  if (parent && children.length > 0) {
    try {
      const firstChildId = children[0]?.id;
      if (firstChildId) {
        const goalsRes = await authFetch(`/api/child-intelligence/${firstChildId}/goals`);
        if (goalsRes.ok) {
          const goalsBody = await readJsonBody(goalsRes);
          const goals = goalsBody.parentGoals;
          if (Array.isArray(goals)) {
            parent.focusAreas = goals.filter((g): g is string => typeof g === "string");
          }
        }
      }
    } catch {
      /* optional */
    }
  }

  return { parent, children };
}

export async function healOnboardingCompletionIfNeeded(
  authFetch: AuthFetchFn,
  progressPercent = 100,
): Promise<SetupStatus | null> {
  const { parent, children } = await fetchProfileCompletionSignals(authFetch);
  if (!inferOnboardingCompleteFromProfile(parent, children, progressPercent)) {
    return null;
  }

  logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
    action: "auto-heal",
    reason: "profile-signals-complete",
    progressPercent,
    childCount: children.length,
  });

  try {
    await authFetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        children: children.map((c) => ({
          name: c.name ?? "",
          ageGroup: "",
          problems: parent?.focusAreas ?? [],
        })),
        parent: {
          caregiver: parent?.role ?? "mother",
          concern: "",
          routineLevel: "medium",
          dietType: parent?.dietType ?? "vegetarian",
        },
        priorityGoal: parent?.focusAreas?.[0] ?? "balanced-routine",
      }),
    });
  } catch {
    /* local bootstrap may still proceed when children exist */
  }

  return { onboardingComplete: true, profileComplete: true };
}
