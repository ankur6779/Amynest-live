import type { AssetRequest, AssetResolveContext, ResolvedAsset } from "../../types/asset-package.js";
import { BaseAssetProvider } from "./base.js";

export class ScreenRecordingProvider extends BaseAssetProvider {
  readonly id = "screen-recording" as const;

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return true;
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    if (
      request.assetType !== "App Screen" &&
      request.assetType !== "Screen Recording"
    ) {
      return null;
    }

    const template =
      extractTemplate(request.prompt) ||
      extractTemplate(request.fallback) ||
      "template.amynest.generic-feature";

    return this.buildResolved(request, context, {
      path: `screen://recordings/${template}.mp4`,
      status: "resolved",
      license: "AmyNest Screen Capture Templates",
      metadata: {
        template,
        source: "screen-recording",
        kind: request.assetType,
      },
    });
  }
}

function extractTemplate(text: string): string | undefined {
  const match = /template\.amynest\.[\w-]+/i.exec(text);
  return match?.[0];
}
