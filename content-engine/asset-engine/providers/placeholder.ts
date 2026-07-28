import type { AssetRequest, AssetResolveContext, ResolvedAsset } from "../../types/asset-package.js";
import { BaseAssetProvider } from "./base.js";

/** Always-available fallback — resolver never fails completely. */
export class PlaceholderProvider extends BaseAssetProvider {
  readonly id = "placeholder" as const;

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return true;
  }
  override supportsBranding(): boolean {
    return true;
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    const fallbackPath =
      request.fallback?.trim() ||
      `placeholder://amynest/${slugify(request.assetType)}.png`;

    return this.buildResolved(request, context, {
      path: fallbackPath.startsWith("asset.") || fallbackPath.startsWith("placeholder://")
        ? normalizeFallback(fallbackPath)
        : `placeholder://amynest/${fallbackPath}`,
      status: "fallback",
      license: "AmyNest Placeholder",
      usedFallback: true,
      metadata: {
        source: "placeholder",
        reason: "fallback-chain",
      },
    });
  }
}

function normalizeFallback(path: string): string {
  if (path.startsWith("placeholder://")) return path;
  if (path.startsWith("asset.")) return `placeholder://amynest/${path}`;
  return path;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
