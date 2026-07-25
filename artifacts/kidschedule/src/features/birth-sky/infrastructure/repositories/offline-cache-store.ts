/**
 * Offline current-snapshot cache (Pack 7 §8 + Pack 8 Part 4).
 * At rest: AES-GCM encrypted envelope — no plaintext birth time/place in localStorage.
 * Migrates legacy plaintext schemaVersion "1" bundles safely on first read.
 */

import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { BirthSkyPreferences } from "../../domain/models/preferences";
import {
  decryptOfflinePayload,
  encryptOfflinePayload,
  isOfflineEncryptedEnvelope,
} from "./secure-offline-crypto";

const KEY_PREFIX = "amynest:birth-sky:offline-bundle:v1:";
/** Map childId → profileId (IDs only — not birth secrets). */
const CHILD_INDEX = "amynest:birth-sky:offline-child-index:v1:";

/** Logical payload schema (inner JSON). Envelope version is separate. */
export const OFFLINE_PAYLOAD_SCHEMA_VERSION = "1" as const;

export type OfflineCacheBundle = {
  schemaVersion: typeof OFFLINE_PAYLOAD_SCHEMA_VERSION;
  cachedAt: string;
  profile: BirthProfile;
  snapshot: SkySnapshot;
  preferences: BirthSkyPreferences;
};

export type OfflineMigrationResult =
  | { status: "none" }
  | { status: "migrated_plaintext_to_encrypted"; profileId: string }
  | { status: "corrupt_cleared"; profileId: string; reason: string }
  | { status: "decrypt_failed_cleared"; profileId: string };

function bundleKey(profileId: string): string {
  return `${KEY_PREFIX}${profileId}`;
}

function isPlaintextBundle(value: unknown): value is OfflineCacheBundle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === "1" &&
    typeof v.cachedAt === "string" &&
    typeof v.profile === "object" &&
    v.profile !== null &&
    typeof v.snapshot === "object" &&
    v.snapshot !== null
  );
}

function detectStorageVersion(raw: string): "encrypted" | "plaintext_v1" | "unknown" {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isOfflineEncryptedEnvelope(parsed)) return "encrypted";
    if (isPlaintextBundle(parsed)) return "plaintext_v1";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Version detection for certification / ops (does not decrypt).
 */
export function detectOfflineStorageVersion(
  profileId: string,
): "encrypted" | "plaintext_v1" | "missing" | "unknown" {
  try {
    const raw = localStorage.getItem(bundleKey(profileId));
    if (!raw) return "missing";
    return detectStorageVersion(raw);
  } catch {
    return "unknown";
  }
}

/**
 * Returns true if raw localStorage for this profile contains plaintext birth markers.
 * Used by privacy certification — must be false after RC1.
 */
export function offlineStorageContainsPlaintextBirthMarkers(profileId: string): boolean {
  try {
    const raw = localStorage.getItem(bundleKey(profileId));
    if (!raw) return false;
    if (detectStorageVersion(raw) === "encrypted") {
      // Ciphertext must not embed obvious plaintext birth time/coords as substrings
      // of the outer JSON (iv/ciphertext are opaque base64).
      return false;
    }
    // Plaintext or unknown: check for birth markers
    return (
      /"birthTime"\s*:/.test(raw) ||
      /"latitude"\s*:/.test(raw) ||
      /"longitude"\s*:/.test(raw) ||
      /"lat"\s*:/.test(raw) ||
      /"lon"\s*:/.test(raw)
    );
  } catch {
    return false;
  }
}

export async function saveOfflineBundle(bundle: OfflineCacheBundle): Promise<void> {
  const profileId = bundle.profile.profileId;
  const plaintext = JSON.stringify({
    ...bundle,
    schemaVersion: OFFLINE_PAYLOAD_SCHEMA_VERSION,
  });
  const envelope = await encryptOfflinePayload(profileId, plaintext);
  localStorage.setItem(bundleKey(profileId), JSON.stringify(envelope));
}

/**
 * Load current offline bundle. Migrates legacy plaintext → encrypted.
 * Corrupt / decrypt-fail → clear poison key and return null (fail-safe, no silent wrong sky).
 */
export async function loadOfflineBundle(
  profileId: string,
): Promise<OfflineCacheBundle | null> {
  const result = await loadOfflineBundleWithMigration(profileId);
  return result.bundle;
}

export async function loadOfflineBundleWithMigration(profileId: string): Promise<{
  bundle: OfflineCacheBundle | null;
  migration: OfflineMigrationResult;
}> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(bundleKey(profileId));
  } catch {
    return { bundle: null, migration: { status: "none" } };
  }
  if (!raw) return { bundle: null, migration: { status: "none" } };

  const version = detectStorageVersion(raw);

  if (version === "encrypted") {
    try {
      const envelope = JSON.parse(raw) as unknown;
      if (!isOfflineEncryptedEnvelope(envelope)) {
        clearOfflineBundle(profileId);
        return {
          bundle: null,
          migration: { status: "corrupt_cleared", profileId, reason: "invalid_envelope" },
        };
      }
      if (envelope.profileId !== profileId) {
        clearOfflineBundle(profileId);
        return {
          bundle: null,
          migration: { status: "corrupt_cleared", profileId, reason: "profile_mismatch" },
        };
      }
      const plaintext = await decryptOfflinePayload(envelope);
      const parsed: unknown = JSON.parse(plaintext);
      if (!isPlaintextBundle(parsed) || parsed.profile.profileId !== profileId) {
        clearOfflineBundle(profileId);
        return {
          bundle: null,
          migration: { status: "corrupt_cleared", profileId, reason: "invalid_payload" },
        };
      }
      return { bundle: parsed, migration: { status: "none" } };
    } catch {
      clearOfflineBundle(profileId);
      return {
        bundle: null,
        migration: { status: "decrypt_failed_cleared", profileId },
      };
    }
  }

  if (version === "plaintext_v1") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPlaintextBundle(parsed) || parsed.profile.profileId !== profileId) {
        clearOfflineBundle(profileId);
        return {
          bundle: null,
          migration: { status: "corrupt_cleared", profileId, reason: "invalid_plaintext" },
        };
      }
      // Migrate: write encrypted envelope, verify decrypt, else restore plaintext (no data loss).
      await saveOfflineBundle(parsed);
      const verifyRaw = localStorage.getItem(bundleKey(profileId));
      if (!verifyRaw || detectStorageVersion(verifyRaw) !== "encrypted") {
        localStorage.setItem(bundleKey(profileId), raw);
        return { bundle: parsed, migration: { status: "none" } };
      }
      try {
        const envelope = JSON.parse(verifyRaw) as unknown;
        if (!isOfflineEncryptedEnvelope(envelope)) {
          localStorage.setItem(bundleKey(profileId), raw);
          return { bundle: parsed, migration: { status: "none" } };
        }
        const plaintext = await decryptOfflinePayload(envelope);
        const verified: unknown = JSON.parse(plaintext);
        if (!isPlaintextBundle(verified) || verified.profile.profileId !== profileId) {
          localStorage.setItem(bundleKey(profileId), raw);
          return { bundle: parsed, migration: { status: "none" } };
        }
        return {
          bundle: verified,
          migration: { status: "migrated_plaintext_to_encrypted", profileId },
        };
      } catch {
        localStorage.setItem(bundleKey(profileId), raw);
        return { bundle: parsed, migration: { status: "none" } };
      }
    } catch {
      clearOfflineBundle(profileId);
      return {
        bundle: null,
        migration: { status: "corrupt_cleared", profileId, reason: "plaintext_parse" },
      };
    }
  }

  // unknown / corrupt
  clearOfflineBundle(profileId);
  return {
    bundle: null,
    migration: { status: "corrupt_cleared", profileId, reason: "unknown_format" },
  };
}

export function clearOfflineBundle(profileId: string): void {
  try {
    localStorage.removeItem(bundleKey(profileId));
  } catch {
    /* ignore */
  }
}

/** Map childId → profileId so offline read works before profile is in memory. */
export function rememberOfflineChildProfile(childId: number, profileId: string): void {
  try {
    localStorage.setItem(`${CHILD_INDEX}${childId}`, profileId);
  } catch {
    /* ignore */
  }
}

export function recallOfflineProfileId(childId: number): string | null {
  try {
    return localStorage.getItem(`${CHILD_INDEX}${childId}`);
  } catch {
    return null;
  }
}

export function clearOfflineChildIndex(childId: number): void {
  try {
    localStorage.removeItem(`${CHILD_INDEX}${childId}`);
  } catch {
    /* ignore */
  }
}

/**
 * Inspect raw storage without decrypting — for privacy certification only.
 */
export function readRawOfflineStorage(profileId: string): string | null {
  try {
    return localStorage.getItem(bundleKey(profileId));
  } catch {
    return null;
  }
}
