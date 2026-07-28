/**
 * First-sky generation pipeline (Create → Snapshot → Formation-ready).
 *
 * States: PENDING → COMPUTING → READY | FAILED
 * Never treats a null snapshot as persisted success. Retries once before FAILED.
 */

import { queueClientLog } from "@/lib/client-logs";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { SetupDraft } from "../../domain/models/setup-draft";
import {
  toGenerationState,
  type SnapshotGenerationState,
} from "../../domain/models/snapshot-generation";
import { BIRTH_SKY_CONSENT_VERSION } from "../../constants/consent";
import {
  BIRTH_SKY_GENERATION_TIMEOUT_MS,
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
  computeStatus: "pending" | "computing" | "ready" | "failed";
  generationStatus: SnapshotGenerationState;
  errorCode?: string;
  steps: FirstSkyPipelineStep[];
  retried: boolean;
  fallbackUsed: boolean;
  durationMs: number;
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

function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "FetchTimeoutError" || err.name === "AbortError") return true;
  const msg = err.message.toLowerCase();
  return (
    msg.startsWith("timeout:") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
}

function isRecoverableCreateError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  if (msg.includes("unauthorized") || msg.includes("consent_required")) return false;
  if (msg.includes("child_not_found") || msg.includes("invalid_body")) return false;
  if (msg.includes("birth_sky_not_enabled")) return false;
  if (msg.includes("missing_birth_data") || msg.includes("missing_child")) return false;
  return (
    isTimeoutError(err) ||
    msg.includes("network") ||
    msg.includes("failed") ||
    msg.includes("fetch") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("invalid_json") ||
    msg.includes("empty") ||
    msg.includes("compute") ||
    msg.includes("ephemeris")
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

function detectFallback(status: CreateBirthSkyResponse): boolean {
  if (status.fallbackUsed) return true;
  return Boolean(status.snapshot?.astronomy?.metadata?.fallbackUsed);
}

function emitTelemetry(
  name:
    | "birth_sky.generation_started"
    | "birth_sky.generation_retry"
    | "birth_sky.generation_fallback_used"
    | "birth_sky.generation_succeeded"
    | "birth_sky.generation_failed",
  props: Record<string, unknown>,
): void {
  trackBirthSkyEvent(name, props);
}

/**
 * Run first-sky generation for a brand-new (or partial) user.
 * `forceFresh` always starts a new generation request (Generate again).
 */
export async function runFirstSkyPipeline(input: {
  authFetch: AuthFetchFn;
  draft: SetupDraft;
  userId?: string | null;
  /** Existing profile from a prior partial create (recovery). */
  existingProfile?: BirthProfile | null;
  /** Guest = no Firebase uid yet / anonymous session. */
  isGuest?: boolean;
  /** Always start a fresh generation request (Generate again). */
  forceFresh?: boolean;
  onStatus?: (status: SnapshotGenerationState) => void;
}): Promise<FirstSkyPipelineResult> {
  const steps: FirstSkyPipelineStep[] = [];
  const userId = input.userId ?? null;
  const draft = normalizeDraft(input.draft);
  const startedAt = Date.now();
  let retried = false;
  let fallbackUsed = false;
  let profile: BirthProfile | null = input.existingProfile ?? null;
  let snapshot: SkySnapshot | null = null;
  let generationStatus: SnapshotGenerationState = "PENDING";

  const setStatus = (status: SnapshotGenerationState) => {
    generationStatus = status;
    input.onStatus?.(status);
  };

  const push = (step: FirstSkyPipelineStep, fields: LogFields = {}) => {
    steps.push(step);
    pipelineLog(step, {
      userId,
      childId: draft.childId,
      generationStatus,
      ...fields,
    });
  };

  const fail = (errorCode: string): FirstSkyPipelineResult => {
    setStatus("FAILED");
    push("failed", { errorCode });
    const durationMs = Date.now() - startedAt;
    emitTelemetry("birth_sky.generation_failed", {
      error_code: errorCode,
      duration_ms: durationMs,
      retried,
      fallback_used: fallbackUsed,
      is_guest: Boolean(input.isGuest),
    });
    return {
      ok: false,
      profile,
      snapshot: null,
      computeStatus: "failed",
      generationStatus: "FAILED",
      errorCode,
      steps,
      retried,
      fallbackUsed,
      durationMs,
    };
  };

  push("validate_birth_data");
  const validationError = validateDraft(draft);
  if (validationError) {
    return fail(validationError);
  }

  push("pending_intent", { isGuest: Boolean(input.isGuest) });
  setStatus("COMPUTING");
  emitTelemetry("birth_sky.generation_started", {
    is_guest: Boolean(input.isGuest),
    force_fresh: Boolean(input.forceFresh),
    has_existing_profile: Boolean(profile),
    time_precision: draft.timePrecision ?? "unknown",
  });

  const finishOk = (status: CreateBirthSkyResponse): FirstSkyPipelineResult => {
    const usedFallback = detectFallback(status);
    if (usedFallback) {
      fallbackUsed = true;
      emitTelemetry("birth_sky.generation_fallback_used", {
        engine_version: status.snapshot?.engineVersion ?? "lite",
        duration_ms: Date.now() - startedAt,
      });
    }
    push("parse_snapshot", {
      hasSnapshot: Boolean(status.snapshot),
      engineVersion: status.snapshot?.engineVersion,
    });
    push("ai_context", {
      hasMeaning: Boolean(status.snapshot?.astronomy?.meaningSnapshot),
    });
    const nextStatus = toGenerationState(
      status.generationStatus ?? (status.snapshot ? "READY" : status.computeStatus),
    );
    // Never treat null snapshot as READY.
    const ready = Boolean(status.snapshot) && nextStatus === "READY";
    setStatus(ready ? "READY" : "FAILED");
    push("save_result", {
      computeStatus: status.computeStatus,
      generationStatus,
      snapshotId: status.snapshot?.snapshotId,
      fallbackUsed,
    });
    const durationMs = Date.now() - startedAt;
    if (ready) {
      push("done");
      emitTelemetry("birth_sky.generation_succeeded", {
        duration_ms: durationMs,
        retried,
        fallback_used: fallbackUsed,
        engine_version: status.snapshot?.engineVersion,
        mode: status.snapshot?.mode,
      });
      return {
        ok: true,
        profile: status.profile,
        snapshot: status.snapshot,
        computeStatus: "ready",
        generationStatus: "READY",
        steps,
        retried,
        fallbackUsed,
        durationMs,
      };
    }
    return fail(status.errorCode ?? "compute_failed");
  };

  const attemptCreate = async (): Promise<CreateBirthSkyResponse> => {
    push("snapshot_create", {
      timePrecision: draft.timePrecision,
      placeProvided: Boolean(draft.birthPlace) && !draft.placeSkipped,
    });
    return withTimeout(
      createBirthSky(input.authFetch, draft),
      BIRTH_SKY_GENERATION_TIMEOUT_MS + 5_000,
      "create",
    );
  };

  const attemptRecompute = async (profileId: string): Promise<CreateBirthSkyResponse> => {
    push("auto_recompute", { profileId, forceFresh: Boolean(input.forceFresh) });
    return withTimeout(
      recomputeBirthSkySnapshot(input.authFetch, profileId, { forceFresh: true }),
      BIRTH_SKY_GENERATION_TIMEOUT_MS + 5_000,
      "recompute",
    );
  };

  const runOnce = async (): Promise<CreateBirthSkyResponse> => {
    // Generate again / interrupted profile → always fresh recompute when profile exists.
    if (profile && (input.forceFresh || !snapshot)) {
      push("profile_init", { profileId: profile.profileId, mode: "reuse" });
      push("astro_generation", { path: "recompute" });
      return attemptRecompute(profile.profileId);
    }

    push("profile_init", { mode: "create" });
    push("astro_generation", { path: "create" });
    const created = await attemptCreate();
    profile = created.profile;
    snapshot = created.snapshot;
    if (detectFallback(created)) fallbackUsed = true;

    if (created.profile && !created.snapshot) {
      // Partial create (status FAILED, no snapshot row) — regenerate once.
      push("auto_recompute", {
        profileId: created.profile.profileId,
        priorError: created.errorCode,
      });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: "missing_snapshot_after_create",
        error_code: created.errorCode ?? "compute_failed",
      });
      const recomputed = await attemptRecompute(created.profile.profileId);
      profile = recomputed.profile ?? created.profile;
      snapshot = recomputed.snapshot;
      if (detectFallback(recomputed)) fallbackUsed = true;
      return { ...recomputed, profile: profile! };
    }

    return created;
  };

  try {
    let result = await runOnce();
    if (
      (!result.snapshot || result.computeStatus === "failed" || result.generationStatus === "FAILED") &&
      isRecoverableCreateError(
        result.errorCode ? new Error(result.errorCode) : new Error("compute_failed"),
      )
    ) {
      retried = true;
      push("retry", { errorCode: result.errorCode ?? "compute_failed" });
      emitTelemetry("birth_sky.generation_retry", {
        error_code: result.errorCode ?? "compute_failed",
        duration_ms: Date.now() - startedAt,
      });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: "first_sky_retry",
        error_code: result.errorCode ?? "compute_failed",
      });
      profile = result.profile ?? profile;
      snapshot = null;
      result = await runOnce();
    }
    return finishOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const timedOut = isTimeoutError(err);
    push(timedOut ? "timeout" : "network_failure", { error: message });

    if (!retried && isRecoverableCreateError(err)) {
      retried = true;
      push("retry", { error: message });
      emitTelemetry("birth_sky.generation_retry", {
        error_code: timedOut ? "timeout" : "network_failure",
        duration_ms: Date.now() - startedAt,
      });
      trackBirthSkyEvent("birth_sky.error_recovery", {
        cause: timedOut ? "timeout_retry" : "network_retry",
        error_code: timedOut ? "timeout" : "network",
      });
      try {
        if (profile) snapshot = null;
        const result = await runOnce();
        return finishOk(result);
      } catch (retryErr) {
        return fail(isTimeoutError(retryErr) ? "timeout" : "network_failure");
      }
    }

    return fail(timedOut ? "timeout" : "network_failure");
  }
}
