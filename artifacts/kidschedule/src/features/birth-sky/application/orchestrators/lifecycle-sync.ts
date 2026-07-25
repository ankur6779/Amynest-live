/**
 * Offline sync cycle (Pack 7 §8 + Addendum A syncTransactionId).
 */

import type { AuthFetchFn } from "../../infrastructure/api/birth-sky-api";
import { syncBirthSky } from "../../infrastructure/api/birth-sky-lifecycle-api";
import {
  loadPreferences,
  savePreferences,
} from "../../infrastructure/repositories/settings-store";
import {
  saveOfflineBundle,
  type OfflineCacheBundle,
} from "../../infrastructure/repositories/offline-cache-store";
import { randomUUID } from "../../lib/random-id";
import { trackBirthSkyEvent } from "../../lib/analytics";

export async function runBirthSkySyncCycle(input: {
  authFetch: AuthFetchFn;
  profileId: string;
  userId: string;
}): Promise<{ ok: true; syncTransactionId: string } | { ok: false; syncTransactionId: string }> {
  const syncTransactionId = randomUUID();
  trackBirthSkyEvent("birth_sky.sync_started", { syncTransactionId });
  try {
    const localPrefs = loadPreferences(input.userId);
    const result = await syncBirthSky(input.authFetch, input.profileId, {
      syncTransactionId,
      preferences: localPrefs,
    });
    savePreferences(input.userId, result.preferences);
    if (result.snapshot) {
      const bundle: OfflineCacheBundle = {
        schemaVersion: "1",
        cachedAt: new Date().toISOString(),
        profile: result.profile,
        snapshot: result.snapshot,
        preferences: result.preferences,
      };
      await saveOfflineBundle(bundle);
    }
    trackBirthSkyEvent("birth_sky.sync_completed", { syncTransactionId });
    return { ok: true, syncTransactionId };
  } catch {
    trackBirthSkyEvent("birth_sky.sync_failed", {
      syncTransactionId,
      error_code: "network",
    });
    return { ok: false, syncTransactionId };
  }
}
