import type {
  AssetCostEstimate,
  AssetProviderHealth,
  AssetProviderId,
  AssetRequest,
  AssetResolveContext,
  ResolvedAsset,
} from "../../types/asset-package.js";
import { BaseAssetProvider } from "./base.js";

export interface FutureAiProviderOptions {
  id: Extract<
    AssetProviderId,
    | "openai-images"
    | "flux"
    | "ideogram"
    | "stable-diffusion"
    | "runway"
    | "future"
  >;
  supportsVideo?: boolean;
  unitCostUsd?: number;
  /** When false, resolve returns null (provider reserved / not configured). */
  planningEnabled?: boolean;
}

/**
 * Future media providers (OpenAI Images, Flux, Ideogram, SD, Runway, Veo).
 * Phase 4 returns planned descriptors only — never generates media.
 */
export class FutureAiProvider extends BaseAssetProvider {
  readonly id: FutureAiProviderOptions["id"];
  private readonly video: boolean;
  private readonly unitCostUsd: number;
  private readonly planningEnabled: boolean;

  constructor(options: FutureAiProviderOptions) {
    super();
    this.id = options.id;
    this.video = options.supportsVideo ?? false;
    this.unitCostUsd = options.unitCostUsd ?? 0.04;
    this.planningEnabled = options.planningEnabled ?? true;
  }

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return this.video;
  }

  override estimateCost(_request: AssetRequest): AssetCostEstimate {
    return { currency: "USD", amount: this.unitCostUsd, unit: "asset" };
  }

  override async health(): Promise<AssetProviderHealth> {
    return {
      ok: this.planningEnabled,
      message: this.planningEnabled
        ? `${this.id} planning slot ready (no media generation in Phase 4)`
        : `${this.id} not configured`,
      checkedAt: new Date().toISOString(),
    };
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    if (!this.planningEnabled || !context.allowGenerationPlanning) {
      return null;
    }

    const isVideoType =
      request.assetType === "Future AI Video" ||
      request.assetType === "Screen Recording" ||
      request.assetType === "Motion Background";

    if (isVideoType && !this.supportsVideo()) return null;
    if (
      !isVideoType &&
      request.assetType !== "AI Image" &&
      request.assetType !== "Promo Image" &&
      request.assetType !== "Illustration"
    ) {
      // Still allow planned AI image for promo/illustration/ai-image only
      if (request.assetType !== "Icon Animation") return null;
    }

    return this.buildResolved(request, context, {
      path: `planned://${this.id}/${context.fingerprint.slice(0, 16)}`,
      status: "planned",
      license: "Pending Provider Generation",
      costEstimateUsd: this.unitCostUsd,
      metadata: {
        source: this.id,
        mode: "planning-only",
        prompt: request.prompt.slice(0, 160),
      },
    });
  }
}

export function createDefaultAiProviders(): FutureAiProvider[] {
  return [
    new FutureAiProvider({ id: "openai-images", unitCostUsd: 0.04 }),
    new FutureAiProvider({ id: "flux", unitCostUsd: 0.03 }),
    new FutureAiProvider({ id: "ideogram", unitCostUsd: 0.035 }),
    new FutureAiProvider({ id: "stable-diffusion", unitCostUsd: 0.02 }),
    new FutureAiProvider({ id: "runway", supportsVideo: true, unitCostUsd: 0.12 }),
    // google-veo is registered as GeminiVideoProvider (real generation).
    new FutureAiProvider({ id: "future", planningEnabled: false }),
  ];
}
