/**
 * First-sky generation pipeline (Create → Snapshot → Formation-ready).
 *
 * Recovers from: missing profile/snapshot, network blips, empty/invalid JSON,
 * compute failures. Retries once before surfacing a hard failure.
 */

import { queueClientLog } from "@/lib/client-logs";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { SetupDraft } from "../../domain/models/setup-draft";
import { BIRTH_SKY_CONSENT_VERSION } from "../../constants/consent";
import {
  createBirthSky,
  recomputeBirthSkySnapshot,
  type AuthFetchFn,
  type CreateBirthSkyResponse,
} from "../../infrastructure/api/birth-sky-api";
import { trackBirthSkyEvent } from "../../lib/analytics";

export type FirstSkyPipelineStep =
  | "validate_birth_data"
  | "pending_intent"
  | "snapshot_create"
  | "profile_init"
  | "astro_generation"
  | "ai_context"
  | "parse_snapshot"
  | "save_result"
  | "auto_recompute"
  | "retry"
  | "timeout"
  | "network_failure"
  | "done"
  | "failed";

export type FirstSkyPipelineResult = {
  ok: boolean;
  profile: BirthProfile | null;
  snapshot: SkySnapshot | null;
  computeStatus: "ready" | "pending" | "failed";
  errorCode?: string;
  steps: FirstSkyPipelineStep[];
  retried: boolean;
};

type LogFields = Record<string, unknown>;

function pipelineLog(step: FirstSkyPipelineStep, fields: LogFields): void {
  queueClientLog({
    type: step === "failed" ? "warning" : "info",
    message: `[birth-sky] pipeline.${step}`,
    meta: {
      feature: "birth_sky",
      event: "birth_sky.first_sky_pipeline",
      step,
      ...fields,
    },
  });
}

function validateDraft(draft: SetupDraft): string | null {
  if (!draft.childId || !Number.isFinite(draft.childId)) return "missing_child";
  if (!draft.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) {
    return "missing_birth_data";
  }
  if (!draft.timePrecision) return "missing_birth_data";
  if (draft.timePrecision !== "unknown" && !draft.birthTime) return "missing_birth_data";
  if (draft.timePrecision === "unknown" && draft.birthTime) return "time_must_be_null";
  if (!draft.consent.disclaimerAccepted) return "consent_required";
  if (!draft.placeSkipped && !draft.birthPlace) return "missing_birth_data";
  return null;
}

function isRecoverableCreateError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  if (msg.includes("unauthorized") || msg.includes("consent_required")) return false;
  if (msg.includes("child_not_found") || msg.includes("invalid_body")) return false;
  if (msg.includes("birth_sky_not_enabled")) return false;
  // network / timeout / 5xx / parse
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("failed") ||
    msg.includes("fetch") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("invalid_json") ||
    msg.includes("empty")
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeDraft(draft: SetupDraft): SetupDraft {
  return {
    ...draft,
    consent: {
      ...draft.consent,
      consentVersion: draft.consent.consentVersion ?? BIRTH_SKY_CONSENT_VERSION,
      acceptedAt: draft.consent.acceptedAt ?? new Date().toISOString(),
    },
  };
}

async function attemptCreate(
  authFetch: AuthFetchFn,
  draft: SetupDraft,
  userId: string | null,
): Promise<CreateBirthSkyResponse> {
  pipelineLog("snapshot_create", {
    userId,
    childId: draft.childId,
    timePrecision: draft.timePrecision,
    placeProvided: Boolean(draft.birthPlace) && !draft.placeSkipped,
  });
  return withTimeout(createBirthSky(authFetch, draft), 45_000, "create");
}

async function attemptRecompute(
  authFetch: AuthFetchFn,
  profileId: string,
  userId: string | null,
): Promise<CreateBirthSkyResponse> {
  pipelineLog("auto_recompute", { userId, profileId });
  return withTimeout(recomputeBirthSkySnapshot(authFetch, profileId), 45_000, "recompute");
}

/**
 * Run first-sky generation for a brand-new (or partial) user.
 * Automatically regenerates a missing snapshot once before failing.
 */
export async function runFirstSkyPipeline(input: {
  authFetch: AuthFetchFn;
  draft: SetupDraft;
  userId?: string | null;
  /** Existing profile from a prior partial create (recovery). */
  existingProfile?: BirthProfile | null;
  /** Guest = no Firebase uid yet / anonymous session. */
  isGuest?: boolean;
}): Promise<FirstSkyPipelineResult> {
  const steps: FirstSkyPipelineStep[] = [];
  const userId = input.userId ?? null;
  const draft = normalizeDraft(input.draft);
  let retried = false;
  let profile: BirthProfile | null = input.existingProfile ?? null;
  let snapshot: SkySnapshot | null = null;

  const push = (step: FirstSkyPipelineStep, fields: LogFields = {}) => {
    steps.push(step);
    pipelineLog(step, { userId, childId: draft.childId, ...fields });
  };

  push("validate_birth_data");
  const validationError = validateDraft(draft);
  if (validationError) {
    push("failed", { errorCode: validationError });
    return {
      ok: false,
      profile,
      snapshot: null,
      computeStatus: "failed",
      errorCode: validationError,
      steps,
      retried,
    };
  }

  push("pending_intent", { isGuest: Boolean(input.isGuest) });

  const finishOk = (status: CreateBirthSkyResponse): FirstSkyPipelineResult => {
    push("parse_snapshot", {
      hasSnapshot: Boolean(status.snapshot),
      engineVersion: status.snapshot?.engineVersion,
    });
    push("ai_context", {
      hasMeaning: Boolean(status.snapshot?.astronomy?.meaningSnapshot),
    });
    push("save_result", {
      computeStatus: status.computeStatus,
      snapshotId: status.snapshot?.snapshotId,
    });
    push("done");
    return {
      ok: Boolean(status.snapshot) && status.computeStatus === "ready",
      profile: status.profile,
      snapshot: status.snapshot,
      computeStatus: status.snapshot ? "ready" : status.computeStatus,
      errorCode: status.errorCode,
      steps,
      retried,
    };
  };

  const runOnce = async (): Promise<CreateBirthSkyResponse> => {
    // Partial profile without snapshot → regenerate instead of re-create.
    if (profile && !snapshot) {
      push("profile_init", { profileId: profile.profileId, mode: "reuse" });
      push("astro_generation", { path: "recompute" });
      push("auto_recompute", { profileId: profile.profileId, reason: "existing_profile" });
      return attemptRecompute(input.authFetch, profile.profileId, userId);
    }

    push("profile_init", { mode: "create" });
    push("astro_generation", { path: "create" });
    const created = await attemptCreate(input.authFetch, draft, userId);
    profile = created.profile;
    snapshot = created.snapshot;

    if (created.profile && !created.snapshot) {
      // Partially created — auto regenerate once inside this attempt.
      push("auto_recompute", {
        profileId: created.profile.profileId,
        priorError: created.errorCode,
      });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: "missing_snapshot_after_create",
        error_code: created.errorCode ?? "compute_failed",
      });
      const recomputed = await attemptRecompute(
        input.authFetch,
        created.profile.profileId,
        userId,
      );
      profile = recomputed.profile ?? created.profile;
      snapshot = recomputed.snapshot;
      return {
        ...recomputed,
        profile: profile!,
      };
    }

    return created;
  };

  try {
    let result = await runOnce();
    if ((!result.snapshot || result.computeStatus === "failed") && isRecoverableCreateError(
      result.errorCode ? new Error(result.errorCode) : new Error("compute_failed"),
    )) {
      retried = true;
      push("retry", { errorCode: result.errorCode ?? "compute_failed" });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: "first_sky_retry",
        error_code: result.errorCode ?? "compute_failed",
      });
      // Keep profile for recompute path on retry.
      profile = result.profile ?? profile;
      snapshot = null;
      result = await runOnce();
    }
    return finishOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.startsWith("timeout:");
    push(isTimeout ? "timeout" : "network_failure", { error: message });

    if (!retried && isRecoverableCreateError(err)) {
      retried = true;
      push("retry", { error: message });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: isTimeout ? "timeout_retry" : "network_retry",
        error_code: isTimeout ? "timeout" : "network",
      });
      try {
        // If profile was created before the throw path, prefer recompute.
        if (profile) snapshot = null;
        const result = await runOnce();
        return finishOk(result);
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        push("failed", { error: retryMsg, retried: true });
        return {
          ok: false,
          profile,
          snapshot: null,
          computeStatus: "failed",
          errorCode: retryMsg.startsWith("timeout:") ? "timeout" : "network_failure",
          steps,
          retried,
        };
      }
    }

    push("failed", { error: message });
    return {
      ok: false,
      profile,
      snapshot: null,
      computeStatus: "failed",
      errorCode: isTimeout ? "timeout" : "network_failure",
      steps,
      retried,
    };
  }
}
