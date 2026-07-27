/**
 * Birth Sky HTTP port (Phase 3 infrastructure/api).
 */

import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { hydrateSkySnapshot } from "../../domain/models/sky-snapshot-compat";
import type { SetupDraft } from "../../domain/models/setup-draft";
import type {
  SnapshotComputeStatus,
  SnapshotGenerationState,
} from "../../domain/models/snapshot-generation";
import { toGenerationState, shouldExposeCurrentSnapshot } from "../../domain/models/snapshot-generation";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

export type CreateBirthSkyResponse = {
  profile: BirthProfile;
  /** Only present when generationStatus === READY. Never a persisted null row. */
  snapshot: SkySnapshot | null;
  computeStatus: SnapshotComputeStatus;
  generationStatus?: SnapshotGenerationState;
  fallbackUsed?: boolean;
  errorCode?: string;
};

function readSnapshotField(raw: unknown): SkySnapshot | null {
  if (raw == null) return null;
  const hydrated = hydrateSkySnapshot(raw);
  // Persist engineVersion from any engine; fail closed only on corrupt payload.
  return hydrated.ok ? hydrated.snapshot : null;
}

function normalizeCreateResponse(
  body: CreateBirthSkyResponse & { snapshot: unknown },
): CreateBirthSkyResponse {
  const snapshot = readSnapshotField(body.snapshot);
  const generationStatus = toGenerationState(
    body.generationStatus ?? body.computeStatus ?? (snapshot ? "READY" : "FAILED"),
  );
  // Harden: never surface a READY status without a hydrated snapshot.
  const ready = Boolean(snapshot) && generationStatus === "READY";
  const status: SnapshotGenerationState = ready
    ? "READY"
    : generationStatus === "COMPUTING"
      ? "COMPUTING"
      : generationStatus === "PENDING"
        ? "PENDING"
        : "FAILED";
  return {
    ...body,
    snapshot: ready ? snapshot : null,
    generationStatus: status,
    computeStatus:
      status === "READY"
        ? "ready"
        : status === "COMPUTING"
          ? "computing"
          : status === "PENDING"
            ? "pending"
            : "failed",
    fallbackUsed:
      Boolean(body.fallbackUsed) ||
      Boolean(snapshot?.astronomy?.metadata?.fallbackUsed),
  };
}

export async function fetchBirthSkyForChild(
  authFetch: AuthFetchFn,
  childId: number,
): Promise<{ profile: BirthProfile | null; snapshot: SkySnapshot | null }> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/children/${childId}`));
  if (res.status === 404) return { profile: null, snapshot: null };
  if (!res.ok) throw new Error(`birth_sky_fetch_failed:${res.status}`);
  const body = await parseApiJson<{
    profile: BirthProfile | null;
    snapshot: unknown;
  }>(res);
  const snapshot = readSnapshotField(body.snapshot);
  const generationStatus = body.profile
    ? toGenerationState(body.profile.generationStatus)
    : undefined;
  return {
    profile: body.profile,
    snapshot: shouldExposeCurrentSnapshot(generationStatus, Boolean(snapshot))
      ? snapshot
      : null,
  };
}

export async function createBirthSky(
  authFetch: AuthFetchFn,
  draft: SetupDraft,
): Promise<CreateBirthSkyResponse> {
  const res = await authFetch(getApiUrl("/api/birth-sky/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      childId: draft.childId,
      birthDate: draft.birthDate,
      birthTime: draft.timePrecision === "unknown" ? null : draft.birthTime,
      timePrecision: draft.timePrecision,
      birthPlace: draft.placeSkipped ? null : draft.birthPlace,
      placeSkipped: draft.placeSkipped,
      consent: {
        consentVersion: draft.consent.consentVersion,
        acceptedAt: draft.consent.acceptedAt,
        scopes: draft.consent.scopes,
        disclaimerAccepted: draft.consent.disclaimerAccepted,
      },
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      typeof body.error === "string" ? body.error : `create_failed:${res.status}`,
    );
  }
  const body = await parseApiJson<CreateBirthSkyResponse & { snapshot: unknown }>(res);
  return normalizeCreateResponse(body);
}

export async function recomputeBirthSkySnapshot(
  authFetch: AuthFetchFn,
  profileId: string,
  options?: { forceFresh?: boolean },
): Promise<CreateBirthSkyResponse> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/profiles/${profileId}/recompute`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceFresh: options?.forceFresh ?? true }),
  });
  if (!res.ok) throw new Error(`recompute_failed:${res.status}`);
  const body = await parseApiJson<CreateBirthSkyResponse & { snapshot: unknown }>(res);
  return normalizeCreateResponse(body);
}
