import type { AssetRequest, AssetResolveContext, ResolvedAsset } from "../../types/asset-package.js";
import { BaseAssetProvider } from "./base.js";

export class IllustrationProvider extends BaseAssetProvider {
  readonly id = "illustration" as const;

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return false;
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    if (
      request.assetType !== "Illustration" &&
      request.assetType !== "Icon Animation" &&
      request.assetType !== "Gradient Background"
    ) {
      return null;
    }

    const slug = slugify(request.assetType);
    return this.buildResolved(request, context, {
      path: `library://illustrations/planned/${slug}-${context.fingerprint.slice(0, 8)}.png`,
      status: "resolved",
      license: "AmyNest Illustration Catalog",
      metadata: {
        source: "illustration",
        promptDigest: context.fingerprint.slice(0, 16),
      },
    });
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
