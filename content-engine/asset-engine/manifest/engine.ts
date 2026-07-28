import type {
  AssetManifest,
  AssetManifestEntry,
  ResolvedAsset,
} from "../../types/asset-package.js";
import { ASSET_MANIFEST_VERSION } from "../../types/asset-package.js";
import type { VisualType } from "../../types/storyboard.js";

export function buildAssetManifest(input: {
  storyboardId: string;
  resolved: readonly ResolvedAsset[];
  assetTypesById: Map<string, VisualType>;
}): AssetManifest {
  const entries: AssetManifestEntry[] = input.resolved.map((asset) => ({
    assetId: asset.assetId,
    sceneId: asset.sceneId,
    provider: asset.provider,
    path: asset.path,
    checksum: asset.checksum,
    width: asset.width,
    height: asset.height,
    status: asset.status,
    license: asset.license,
    createdAt: asset.createdAt,
    fingerprint: asset.fingerprint,
    assetType: input.assetTypesById.get(asset.assetId) ?? "Illustration",
  }));

  return {
    version: ASSET_MANIFEST_VERSION,
    storyboardId: input.storyboardId,
    createdAt: new Date().toISOString(),
    entries,
  };
}
