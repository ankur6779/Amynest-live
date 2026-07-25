/**
 * Birth Sky HTTP port (Phase 3 infrastructure/api).
 */

import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { hydrateSkySnapshot } from "../../domain/models/sky-snapshot-compat";
import type { SetupDraft } from "../../domain/models/setup-draft";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

export type CreateBirthSkyResponse = {
  profile: BirthProfile;
  snapshot: SkySnapshot | null;
  computeStatus: "ready" | "pending" | "failed";
  errorCode?: string;
};

function readSnapshotField(raw: unknown): SkySnapshot | null {
  if (raw == null) return null;
  const hydrated = hydrateSkySnapshot(raw);
  // Persist engineVersion from any engine; fail closed only on corrupt payload.
  return hydrated.ok ? hydrated.snapshot : null;
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
  return {
    profile: body.profile,
    snapshot: readSnapshotField(body.snapshot),
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
  return {
    ...body,
    snapshot: readSnapshotField(body.snapshot),
  };
}

export async function recomputeBirthSkySnapshot(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<CreateBirthSkyResponse> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/profiles/${profileId}/recompute`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`recompute_failed:${res.status}`);
  const body = await parseApiJson<CreateBirthSkyResponse & { snapshot: unknown }>(res);
  return {
    ...body,
    snapshot: readSnapshotField(body.snapshot),
  };
}
