import type {
  AssetCostEstimate,
  AssetProviderHealth,
  AssetProviderId,
  AssetRequest,
  AssetResolveContext,
  AssetStatus,
  ResolvedAsset,
} from "../../types/asset-package.js";
import type { AssetProvider } from "./types.js";
import { parseResolution } from "../planner/geometry.js";

export abstract class BaseAssetProvider implements AssetProvider {
  abstract readonly id: AssetProviderId;

  abstract supportsImages(): boolean;
  abstract supportsVideo(): boolean;
  supportsBranding(): boolean {
    return false;
  }
  supportsBatch(): boolean {
    return true;
  }

  async health(): Promise<AssetProviderHealth> {
    return {
      ok: true,
      message: `${this.id} ready`,
      checkedAt: new Date().toISOString(),
    };
  }

  estimateCost(_request: AssetRequest): AssetCostEstimate {
    return { currency: "USD", amount: 0, unit: "asset" };
  }

  abstract resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null>;

  protected buildResolved(
    request: AssetRequest,
    context: AssetResolveContext,
    options: {
      path: string;
      status: AssetStatus;
      license?: string;
      costEstimateUsd?: number;
      fromCache?: boolean;
      usedFallback?: boolean;
      metadata?: Record<string, string | number | boolean>;
    },
  ): ResolvedAsset {
    const { width, height } = parseResolution(request.resolution);
    return {
      assetId: request.assetId,
      requestId: request.requestId,
      sceneId: request.sceneId,
      provider: this.id,
      path: options.path,
      checksum: context.fingerprint.slice(0, 32),
      fingerprint: context.fingerprint,
      width: context.width || width,
      height: context.height || height,
      aspectRatio: request.aspectRatio,
      status: options.status,
      license: options.license ?? "AmyNest Internal / Planning Descriptor",
      createdAt: new Date().toISOString(),
      costEstimateUsd: options.costEstimateUsd ?? 0,
      fromCache: options.fromCache ?? false,
      usedFallback: options.usedFallback ?? false,
      metadata: options.metadata ?? {},
    };
  }
}
