/**
 * Edit Birth Details → regenerate (Pack 7 §2–3).
 * Profile write then new snapshot; never mutates historical snapshot bodies.
 */

import type { AuthFetchFn } from "../../infrastructure/api/birth-sky-api";
import {
  patchBirthProfile,
  regenerateBirthSky,
} from "../../infrastructure/api/birth-sky-lifecycle-api";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { TimePrecision } from "../../domain/models/setup-draft";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { saveOfflineBundle } from "../../infrastructure/repositories/offline-cache-store";
import { loadPreferences } from "../../infrastructure/repositories/settings-store";

export async function editBirthDetailsAndRegenerate(input: {
  authFetch: AuthFetchFn;
  profile: BirthProfile;
  next: {
    birthDate: string;
    birthTime: string | null;
    timePrecision: TimePrecision;
    birthPlace: BirthProfile["birthPlace"];
  };
}): Promise<{ profile: BirthProfile; snapshot: SkySnapshot }> {
  trackBirthSkyEvent("birth_sky.regeneration_started", {
    offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  });
  const started = Date.now();
  try {
    const profile = await patchBirthProfile(
      input.authFetch,
      input.profile.profileId,
      input.next,
    );
    const result = await regenerateBirthSky(input.authFetch, profile.profileId);
    if (!result.snapshot || result.computeStatus === "failed") {
      trackBirthSkyEvent("birth_sky.regeneration_failed", {
        error_code: "compute_failed",
      });
      throw new Error("regeneration_failed");
    }
    const prefs = loadPreferences(profile.userId);
    await saveOfflineBundle({
      schemaVersion: "1",
      cachedAt: new Date().toISOString(),
      profile: result.profile,
      snapshot: result.snapshot,
      preferences: prefs,
    });
    trackBirthSkyEvent("birth_sky.regeneration_completed", {
      snapshotVersion: result.snapshot.snapshotVersion,
      engineVersion: result.snapshot.engineVersion,
      regeneration_duration_bucket: durationBucket(Date.now() - started),
    });
    trackBirthSkyEvent("birth_sky.snapshot_regenerated", {
      snapshotVersion: result.snapshot.snapshotVersion,
      engineVersion: result.snapshot.engineVersion,
    });
    return { profile: result.profile, snapshot: result.snapshot };
  } catch (err) {
    if (!(err instanceof Error && err.message === "regeneration_failed")) {
      trackBirthSkyEvent("birth_sky.regeneration_failed", {
        error_code: "network",
      });
    }
    throw err;
  }
}

function durationBucket(ms: number): string {
  if (ms < 1000) return "lt_1s";
  if (ms < 3000) return "1_3s";
  if (ms < 8000) return "3_8s";
  return "gte_8s";
}
