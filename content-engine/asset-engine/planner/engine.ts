import type {
  AssetProviderId,
  AssetRequest,
} from "../../types/asset-package.js";
import type { StoryboardPackage } from "../../types/storyboard.js";
import { resolutionForAspect } from "./geometry.js";

export interface PlanAssetRequestsOptions {
  preferredProviders: AssetProviderId[];
}

/** Read StoryboardPackage and emit one AssetRequest per required visual. */
export function planAssetRequests(
  storyboard: StoryboardPackage,
  options: PlanAssetRequestsOptions,
): AssetRequest[] {
  const resolution =
    storyboard.resolution || resolutionForAspect(storyboard.aspectRatio);
  const requests: AssetRequest[] = [];
  const seen = new Set<string>();

  for (const requirement of storyboard.assets) {
    if (seen.has(requirement.assetId)) continue;
    seen.add(requirement.assetId);

    const scene = storyboard.scenes.find((s) => s.sceneId === requirement.sceneId);
    const brandingRequired =
      scene?.purpose === "cta" ||
      scene?.purpose === "brand-end" ||
      requirement.requiredAssetType === "Promo Image";

    requests.push({
      requestId: `req_${requirement.assetId}`,
      assetId: requirement.assetId,
      assetType: requirement.requiredAssetType,
      priority: requirement.priority,
      sceneId: requirement.sceneId,
      resolution,
      aspectRatio: storyboard.aspectRatio,
      brandingRequired,
      prompt: requirement.imagePrompt || requirement.videoPrompt || scene?.caption || storyboard.source.title,
      fallback: requirement.fallbackAsset,
      providerPreference: buildProviderPreference(
        requirement.requiredAssetType,
        options.preferredProviders,
      ),
      fingerprintSeed: [
        storyboard.id,
        requirement.assetId,
        requirement.sceneId,
        requirement.requiredAssetType,
      ].join(":"),
    });
  }

  // Ensure every scene has at least one request even if assets list drifted.
  for (const scene of storyboard.scenes) {
    const has = requests.some((r) => r.sceneId === scene.sceneId);
    if (has) continue;
    const assetId = `${scene.sceneId}-asset-01`;
    if (seen.has(assetId)) continue;
    seen.add(assetId);
    requests.push({
      requestId: `req_${assetId}`,
      assetId,
      assetType: scene.visualType,
      priority: scene.priority,
      sceneId: scene.sceneId,
      resolution,
      aspectRatio: storyboard.aspectRatio,
      brandingRequired: scene.purpose === "cta" || scene.purpose === "brand-end",
      prompt: scene.caption,
      fallback: "asset.fallback.illustration",
      providerPreference: buildProviderPreference(
        scene.visualType,
        options.preferredProviders,
      ),
      fingerprintSeed: `${storyboard.id}:${assetId}`,
    });
  }

  return requests.sort((a, b) => b.priority - a.priority || a.assetId.localeCompare(b.assetId));
}

function buildProviderPreference(
  assetType: AssetRequest["assetType"],
  preferred: AssetProviderId[],
): AssetProviderId[] {
  const typeHints: AssetProviderId[] = [];
  if (assetType === "App Screen" || assetType === "Screen Recording") {
    typeHints.push("screen-recording", "local-library");
  } else if (assetType === "Illustration" || assetType === "Icon Animation") {
    typeHints.push("illustration", "local-library");
  } else if (assetType === "AI Image" || assetType === "Future AI Video") {
    typeHints.push("openai-images", "flux", "ideogram", "runway", "google-veo");
  } else {
    typeHints.push("local-library", "illustration");
  }

  const merged: AssetProviderId[] = [...preferred, ...typeHints, "placeholder"];
  const unique: AssetProviderId[] = [];
  for (const id of merged) {
    if (!unique.includes(id)) unique.push(id);
  }
  return unique;
}
