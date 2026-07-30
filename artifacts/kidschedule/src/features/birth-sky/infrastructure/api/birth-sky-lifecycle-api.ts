/**
 * Birth Sky lifecycle HTTP client (Pack 7).
 */

import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import type { AuthFetchFn } from "./birth-sky-api";
import { BIRTH_SKY_GENERATION_TIMEOUT_MS } from "./birth-sky-api";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { BirthSkyPreferences } from "../repositories/settings-store";
import type { BirthSkyExportType } from "../../constants/lifecycle";

export async function fetchPreferences(authFetch: AuthFetchFn): Promise<{
  preferences: BirthSkyPreferences;
  requiredPrivacyPolicyVersion: string;
}> {
  const res = await authFetch(getApiUrl("/api/birth-sky/preferences"));
  if (!res.ok) throw new Error(`prefs_failed:${res.status}`);
  return parseApiJson(res);
}

export async function putPreferences(
  authFetch: AuthFetchFn,
  preferences: BirthSkyPreferences,
): Promise<BirthSkyPreferences> {
  const res = await authFetch(getApiUrl("/api/birth-sky/preferences"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) throw new Error(`prefs_put_failed:${res.status}`);
  const body = await parseApiJson<{ preferences: BirthSkyPreferences }>(res);
  return body.preferences;
}

export async function patchBirthProfile(
  authFetch: AuthFetchFn,
  profileId: string,
  body: {
    birthDate: string;
    birthTime: string | null;
    timePrecision: "exact" | "approximate" | "unknown";
    birthPlace: BirthProfile["birthPlace"];
  },
): Promise<BirthProfile> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/profiles/${profileId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch_failed:${res.status}`);
  const data = await parseApiJson<{ profile: BirthProfile }>(res);
  return data.profile;
}

export async function regenerateBirthSky(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<{ profile: BirthProfile; snapshot: SkySnapshot | null; computeStatus: string }> {
  // Same budget as create/recompute — ephemeris can exceed the 8s default.
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/regenerate`),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    BIRTH_SKY_GENERATION_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`regenerate_failed:${res.status}`);
  return parseApiJson(res);
}

export type SnapshotHistoryItem = SkySnapshot & {
  isCurrent?: boolean;
  astronomySummary?: {
    sunSign: string | null;
    moonSign: string | null;
    moonPhaseLabel: string | null;
    mode: string;
  };
};

export async function listSnapshots(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<SnapshotHistoryItem[]> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/profiles/${profileId}/snapshots`));
  if (!res.ok) throw new Error(`list_snapshots_failed:${res.status}`);
  const body = await parseApiJson<{ snapshots: SnapshotHistoryItem[] }>(res);
  return body.snapshots ?? [];
}

export async function activateSnapshot(
  authFetch: AuthFetchFn,
  profileId: string,
  snapshotId: string,
): Promise<SkySnapshot> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/snapshots/${snapshotId}/activate`),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  if (!res.ok) throw new Error(`activate_failed:${res.status}`);
  const body = await parseApiJson<{ snapshot: SkySnapshot }>(res);
  return body.snapshot;
}

export async function acceptPrivacyPolicy(
  authFetch: AuthFetchFn,
  profileId: string,
  privacyPolicyVersion: string,
): Promise<BirthProfile> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/privacy-accept`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyPolicyVersion }),
    },
  );
  if (!res.ok) throw new Error(`privacy_accept_failed:${res.status}`);
  const body = await parseApiJson<{ profile: BirthProfile }>(res);
  return body.profile;
}

export async function exportBirthSky(
  authFetch: AuthFetchFn,
  profileId: string,
  type: BirthSkyExportType,
): Promise<Record<string, unknown>> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/export?type=${encodeURIComponent(type)}`),
  );
  if (!res.ok) throw new Error(`export_failed:${res.status}`);
  return parseApiJson(res);
}

export async function deleteBirthSkyProfile(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<void> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}?confirm=DELETE`),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`delete_failed:${res.status}`);
}

export async function deleteConversation(
  authFetch: AuthFetchFn,
  conversationId: string,
): Promise<void> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/conversations/${conversationId}`),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`delete_conversation_failed:${res.status}`);
}

export async function syncBirthSky(
  authFetch: AuthFetchFn,
  profileId: string,
  body: { syncTransactionId: string; preferences?: BirthSkyPreferences },
): Promise<{
  syncTransactionId: string;
  profile: BirthProfile;
  snapshot: SkySnapshot | null;
  preferences: BirthSkyPreferences;
  requiredPrivacyPolicyVersion: string;
}> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/profiles/${profileId}/sync`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sync_failed:${res.status}`);
  return parseApiJson(res);
}
