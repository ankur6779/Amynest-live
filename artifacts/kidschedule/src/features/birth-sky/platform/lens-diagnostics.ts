/**
 * Developer Experience — registry diagnostics (Pack 10 §1.1 Observe / Part 4).
 * Tooling only — no end-user product surfaces.
 */

import { BIRTH_SKY_LENS_SDK_VERSION } from "./constants";
import {
  getDuplicateReports,
  getLens,
  listLenses,
} from "./lens-registry";
import { getLensRuntimeError, getLensRuntimeStatus } from "./lens-runtime";
import { validateLensManifest } from "./lens-validate";
import { ALL_LENS_PERMISSIONS, canContribute } from "./permissions";
import type { ContributionKind } from "./permissions";
import type { RegisteredLens } from "./lens-types";

export type LensCapabilityInspection = {
  lensId: string;
  capabilities: string[];
  permissions: string[];
  contributionsAllowed: Record<ContributionKind, boolean>;
  sdkVersion: string | undefined;
  platformSdkVersion: string;
};

export type RegistryDiagnosticsDump = {
  platformSdkVersion: string;
  lensCount: number;
  lenses: Array<{
    lensId: string;
    lensVersion: string;
    state: string;
    orderHint: number;
    featureFlag: string;
    capabilities: string[];
    permissions: string[];
    runtimeStatus: string;
    lastError: string | null;
    chunkLoaded: boolean;
  }>;
  duplicates: ReturnType<typeof getDuplicateReports>;
  validation: Array<ReturnType<typeof validateLensManifest>>;
};

export function inspectLensCapabilities(lensId: string): LensCapabilityInspection | null {
  const lens = getLens(lensId);
  if (!lens) return null;
  const kinds: ContributionKind[] = [
    "dashboard",
    "settings",
    "routes",
    "ai",
    "offline",
    "export",
    "delete",
    "analytics",
  ];
  const contributionsAllowed = {} as Record<ContributionKind, boolean>;
  for (const k of kinds) {
    contributionsAllowed[k] = canContribute(lens.metadata.capabilities, k);
  }
  return {
    lensId,
    capabilities: [...lens.metadata.capabilities],
    permissions: [...lens.permissions],
    contributionsAllowed,
    sdkVersion: lens.metadata.sdkVersion,
    platformSdkVersion: BIRTH_SKY_LENS_SDK_VERSION,
  };
}

export function dumpLensRegistryDiagnostics(): RegistryDiagnosticsDump {
  const lenses = listLenses({ includeRetired: true });
  return {
    platformSdkVersion: BIRTH_SKY_LENS_SDK_VERSION,
    lensCount: lenses.length,
    lenses: lenses.map((l: RegisteredLens) => ({
      lensId: l.metadata.lensId,
      lensVersion: l.metadata.lensVersion,
      state: l.state,
      orderHint: l.metadata.orderHint,
      featureFlag: l.metadata.featureFlag,
      capabilities: [...l.metadata.capabilities],
      permissions: [...l.permissions],
      runtimeStatus: getLensRuntimeStatus(l.metadata.lensId),
      lastError: l.lastError ?? getLensRuntimeError(l.metadata.lensId),
      chunkLoaded: l.chunkLoaded,
    })),
    duplicates: getDuplicateReports(),
    validation: lenses.map((l) => validateLensManifest(l.metadata, l.plugins)),
  };
}

export function formatLensValidationErrors(lensId: string): string[] {
  const lens = getLens(lensId);
  if (!lens) return [`Lens not registered: ${lensId}`];
  const report = validateLensManifest(lens.metadata, lens.plugins);
  return report.issues.filter((i) => i.severity === "error").map((i) => `${i.code}: ${i.message}`);
}

/** Known permission catalog for DX inspection. */
export function listPlatformPermissionCatalog(): readonly string[] {
  return ALL_LENS_PERMISSIONS;
}
