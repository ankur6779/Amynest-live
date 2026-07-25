/**
 * Lens contract validation (Pack 10 Part 4) — fail closed.
 */

import { BIRTH_SKY_LENS_SDK_VERSION } from "./constants";
import { canContribute, type ContributionKind } from "./permissions";
import type { LensDefinition, LensMetadata, LensPlugins } from "./lens-types";

export type LensValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type LensValidationReport = {
  lensId: string;
  ok: boolean;
  sdkPeerOk: boolean;
  issues: LensValidationIssue[];
};

function sdkPeerSatisfied(declared?: string): boolean {
  if (!declared) return true; // Pack 10: optional on legacy; birth_sky may omit
  return (
    declared === BIRTH_SKY_LENS_SDK_VERSION ||
    declared.startsWith("birth_sky_lens_sdk/1.")
  );
}

function contributionPresent(plugins: LensPlugins | undefined, kind: ContributionKind): boolean {
  if (!plugins) return false;
  switch (kind) {
    case "dashboard":
      return Boolean(plugins.dashboard);
    case "settings":
      return Boolean(plugins.settings);
    case "routes":
      return Boolean(plugins.routes);
    case "ai":
      return Boolean(plugins.aiContext);
    case "offline":
      return Boolean(plugins.offline);
    case "export":
      return Boolean(plugins.export);
    case "delete":
      return Boolean(plugins.delete);
    case "analytics":
      return Boolean(plugins.analytics);
    default:
      return false;
  }
}

export function validateLensManifest(
  metadata: LensMetadata,
  plugins?: LensPlugins,
): LensValidationReport {
  const issues: LensValidationIssue[] = [];
  if (!metadata.lensId || !/^[a-z][a-z0-9_]*$/.test(metadata.lensId)) {
    issues.push({
      code: "invalid_lens_id",
      message: "lensId must be opaque snake_case",
      severity: "error",
    });
  }
  if (!metadata.displayName) {
    issues.push({
      code: "missing_display_name",
      message: "displayName required",
      severity: "error",
    });
  }
  if (!metadata.lensVersion) {
    issues.push({
      code: "missing_lens_version",
      message: "lensVersion required",
      severity: "error",
    });
  }
  if (!metadata.featureFlag) {
    issues.push({
      code: "missing_feature_flag",
      message: "featureFlag mandatory (Pack 10 §2.3)",
      severity: "error",
    });
  }
  if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
    issues.push({
      code: "missing_capabilities",
      message: "capabilities[] required",
      severity: "error",
    });
  }

  const sdkPeerOk = sdkPeerSatisfied(metadata.sdkVersion);
  if (!sdkPeerOk) {
    issues.push({
      code: "sdk_peer_mismatch",
      message: `sdkVersion ${metadata.sdkVersion} incompatible with ${BIRTH_SKY_LENS_SDK_VERSION}`,
      severity: "error",
    });
  }

  const kinds: ContributionKind[] = [
    "dashboard",
    "settings",
    "ai",
    "offline",
    "export",
    "delete",
  ];
  for (const kind of kinds) {
    if (contributionPresent(plugins, kind) && !canContribute(metadata.capabilities, kind)) {
      issues.push({
        code: "undeclared_contribution",
        message: `Contribution "${kind}" requires undeclared capability`,
        severity: "error",
      });
    }
  }

  if (plugins?.computePlugin?.hasOwnCompute && !metadata.capabilities.includes("hasOwnCompute")) {
    issues.push({
      code: "undeclared_compute",
      message: "computePlugin requires hasOwnCompute capability",
      severity: "error",
    });
  }

  return {
    lensId: metadata.lensId || "unknown",
    ok: issues.every((i) => i.severity !== "error"),
    sdkPeerOk,
    issues,
  };
}

export function validateLensDefinition(def: LensDefinition): LensValidationReport {
  return validateLensManifest(def.metadata, def.plugins);
}
