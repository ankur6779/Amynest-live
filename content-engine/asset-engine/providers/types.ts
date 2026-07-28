import type {
  AssetCostEstimate,
  AssetProviderHealth,
  AssetProviderId,
  AssetRequest,
  AssetResolveContext,
  ResolvedAsset,
} from "../../types/asset-package.js";

/**
 * Provider-agnostic asset provider contract.
 * Orchestration never imports vendor SDKs — only this interface.
 * Providers may return planned descriptors or real on-disk media.
 */
export interface AssetProvider {
  readonly id: AssetProviderId;
  health(): Promise<AssetProviderHealth>;
  supportsImages(): boolean;
  supportsVideo(): boolean;
  supportsBranding(): boolean;
  supportsBatch(): boolean;
  estimateCost(request: AssetRequest): AssetCostEstimate;
  /**
   * Resolve a virtual/local/planned asset descriptor.
   * Returns null when this provider cannot fulfill the request.
   */
  resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null>;
}
