/**
 * Birth Sky Version Registry (Pack 8 Addendum A Compatibility Matrix axes).
 * Opaque version strings only — no product behavior.
 */

import { BIRTH_SKY_ENGINE_VERSION_WRITES } from "../domain/models/birth-profile";
import { TRADITIONAL_CONTENT_VERSION } from "../constants/traditional-content";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../constants/ai-context";
import {
  BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  BIRTH_SKY_PRIVACY_POLICY_VERSION,
} from "../constants/lifecycle";
import { BIRTH_SKY_CONSENT_VERSION } from "../constants/consent";
import { BIRTH_SKY_LENS_SDK_VERSION } from "../platform/constants";

/** App build label for this certification train (engineering artifact). */
export const BIRTH_SKY_CERT_APP_BUILD = "birth_sky_rc3/1.0.0" as const;

/**
 * Offline at-rest schema (Pack 7 client cache + Pack 8 Part 4).
 * "2" = AES-GCM encrypted envelope in localStorage; inner payload schema remains "1".
 */
export const BIRTH_SKY_OFFLINE_BUNDLE_SCHEMA = "2" as const;

/**
 * modelVersion is recorded per AI delivery (Pack 6) — not a module-global constant.
 * Matrix documents the storage location only.
 */
export const BIRTH_SKY_MODEL_VERSION_POLICY =
  "per_delivery_on_conversation_messages" as const;

export type VersionRegistrySnapshot = {
  appBuild: typeof BIRTH_SKY_CERT_APP_BUILD;
  engineVersion: {
    computeWrites: string;
    readableMin: string;
    notes: string;
  };
  traditionalContentVersion: {
    current: string;
    notes: string;
  };
  contextSchemaVersion: {
    write: string;
    supported: readonly string[];
  };
  exportManifestVersion: {
    write: string;
    supported: readonly string[];
  };
  privacyPolicyVersion: {
    required: string;
  };
  consentVersion: {
    current: string;
  };
  lensSdkVersion: {
    current: string;
  };
  offlineBundleSchema: {
    current: string;
  };
  modelVersion: {
    policy: typeof BIRTH_SKY_MODEL_VERSION_POLICY;
  };
  lensPrimary: {
    lensId: "birth_sky";
    lensVersion: "1.0.0";
  };
};

export function getVersionRegistrySnapshot(): VersionRegistrySnapshot {
  return {
    appBuild: BIRTH_SKY_CERT_APP_BUILD,
    engineVersion: {
      computeWrites: BIRTH_SKY_ENGINE_VERSION_WRITES,
      readableMin: "amynest-astro-lite/1.0.0",
      notes:
        "New writes use skyfield-jpl/1.0.0. Legacy amynest-astro-lite snapshots remain readable without auto-regen.",
    },
    traditionalContentVersion: {
      current: TRADITIONAL_CONTENT_VERSION,
      notes: "Content bump does not require sky snapshot regeneration (Pack 5 Addendum A).",
    },
    contextSchemaVersion: {
      write: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      supported: [BIRTH_SKY_CONTEXT_SCHEMA_VERSION],
    },
    exportManifestVersion: {
      write: BIRTH_SKY_EXPORT_MANIFEST_VERSION,
      supported: [BIRTH_SKY_EXPORT_MANIFEST_VERSION],
    },
    privacyPolicyVersion: {
      required: BIRTH_SKY_PRIVACY_POLICY_VERSION,
    },
    consentVersion: {
      current: BIRTH_SKY_CONSENT_VERSION,
    },
    lensSdkVersion: {
      current: BIRTH_SKY_LENS_SDK_VERSION,
    },
    offlineBundleSchema: {
      current: BIRTH_SKY_OFFLINE_BUNDLE_SCHEMA,
    },
    modelVersion: {
      policy: BIRTH_SKY_MODEL_VERSION_POLICY,
    },
    lensPrimary: {
      lensId: "birth_sky",
      lensVersion: "1.0.0",
    },
  };
}

/** Fail-safe: unsupported export manifest must not be treated as valid. */
export function isSupportedExportManifestVersion(version: string): boolean {
  return getVersionRegistrySnapshot().exportManifestVersion.supported.includes(
    version as typeof BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  );
}

export function isSupportedContextSchemaVersion(version: string): boolean {
  return getVersionRegistrySnapshot().contextSchemaVersion.supported.includes(
    version as typeof BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
  );
}
