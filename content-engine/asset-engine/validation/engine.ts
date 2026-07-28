import type {
  AssetPackage,
  AssetValidationIssue,
  AssetValidationReport,
} from "../../types/asset-package.js";
import { matchesAspectRatio } from "../planner/geometry.js";

/** Validate resolved asset package integrity and branding constraints. */
export function validateAssetPackage(pkg: AssetPackage): AssetValidationReport {
  const errors: AssetValidationIssue[] = [];
  const warnings: AssetValidationIssue[] = [];

  const push = (
    severity: "error" | "warning",
    path: string,
    message: string,
  ) => {
    (severity === "error" ? errors : warnings).push({ path, message, severity });
  };

  if (!pkg.storyboardId.trim()) {
    push("error", "storyboardId", "storyboardId is required");
  }

  if (pkg.resolvedAssets.length === 0) {
    push("error", "resolvedAssets", "no assets were resolved");
  }

  const ids = new Set<string>();
  for (const asset of pkg.resolvedAssets) {
    if (ids.has(asset.assetId)) {
      push("error", `resolvedAssets.${asset.assetId}`, "duplicate asset id");
    }
    ids.add(asset.assetId);

    if (!asset.path.trim()) {
      push("error", `resolvedAssets.${asset.assetId}.path`, "asset path is empty");
    }

    if (asset.width < 720 || asset.height < 720) {
      push(
        "warning",
        `resolvedAssets.${asset.assetId}.resolution`,
        `low resolution ${asset.width}x${asset.height}`,
      );
    }

    if (!matchesAspectRatio(asset.width, asset.height, asset.aspectRatio)) {
      push(
        "error",
        `resolvedAssets.${asset.assetId}.aspectRatio`,
        `dimensions ${asset.width}x${asset.height} do not match ${asset.aspectRatio}`,
      );
    }

    const manifestEntry = pkg.assetManifest.entries.find(
      (e) => e.assetId === asset.assetId,
    );
    if (!manifestEntry) {
      push(
        "error",
        `assetManifest.${asset.assetId}`,
        "resolved asset missing from manifest",
      );
    } else if (manifestEntry.path !== asset.path) {
      push(
        "error",
        `assetManifest.${asset.assetId}.path`,
        "manifest path does not match resolved asset",
      );
    }
  }

  for (const entry of pkg.assetManifest.entries) {
    if (!ids.has(entry.assetId) && entry.sceneId !== "branding") {
      push(
        "warning",
        `assetManifest.${entry.assetId}`,
        "manifest entry has no matching resolved asset",
      );
    }
  }

  for (const missing of pkg.missingAssets) {
    if (!missing.fallbackUsed) {
      push(
        "error",
        `missingAssets.${missing.assetId}`,
        missing.reason,
      );
    } else {
      push(
        "warning",
        `missingAssets.${missing.assetId}`,
        missing.reason,
      );
    }
  }

  const branding = pkg.brandingAssets;
  if (!branding.logo.path || !branding.watermark.path) {
    push("error", "brandingAssets", "logo or watermark path missing");
  }
  if (!branding.qrPlaceholder.path || !branding.playStorePlaceholder.path) {
    push("warning", "brandingAssets.placeholders", "QR or Play Store placeholder missing");
  }
  if (!branding.cta.trim()) {
    push("warning", "brandingAssets.cta", "CTA text is empty");
  }
  if (!branding.colors.primary || !branding.typography.display) {
    push("error", "brandingAssets", "branding colors/typography incomplete");
  }

  // Broken references: scene assets should map to known scene ids in manifest
  const sceneIds = new Set(pkg.resolvedAssets.map((a) => a.sceneId));
  for (const entry of pkg.assetManifest.entries) {
    if (entry.sceneId !== "branding" && !sceneIds.has(entry.sceneId)) {
      // sceneId on manifest comes from resolved assets; if mismatch, warn
      push(
        "warning",
        `assetManifest.${entry.assetId}.sceneId`,
        `scene reference ${entry.sceneId} not present in resolved scene set`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
