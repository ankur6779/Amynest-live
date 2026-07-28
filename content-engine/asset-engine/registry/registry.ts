import type { AssetProviderId } from "../../types/asset-package.js";
import {
  createDefaultAiProviders,
  GeminiImageProvider,
  GeminiVideoProvider,
  IllustrationProvider,
  LocalLibraryProvider,
  PlaceholderProvider,
  ScreenRecordingProvider,
  type AssetProvider,
} from "../providers/index.js";
import { resolveGeminiMediaSettings, readGeminiApiKey } from "../../config/gemini-media.js";
import { resolveVideoModelId } from "../../types/gemini-media.js";
import { resolveGeminiVideoSettings } from "../providers/gemini-video/index.js";

export interface AssetProviderRegistryOptions {
  providers?: AssetProvider[];
}

/** Registry of asset providers — orchestration depends only on interfaces. */
export class AssetProviderRegistry {
  private readonly providers = new Map<AssetProviderId, AssetProvider>();

  constructor(options: AssetProviderRegistryOptions = {}) {
    const media = resolveGeminiMediaSettings();
    const apiKey = readGeminiApiKey(media);
    const videoModel = resolveVideoModelId(media.video);
    const defaults: AssetProvider[] = [
      new LocalLibraryProvider(),
      new ScreenRecordingProvider(),
      new IllustrationProvider(),
      new PlaceholderProvider(),
      ...createDefaultAiProviders(),
      new GeminiImageProvider({
        apiKey: apiKey || undefined,
        model: media.image.model,
        premiumModel: media.image.premiumModel,
        fallbackModel: media.image.fallbackModel,
        baseUrl: media.baseUrl,
        outputDirectory: `${media.outputDirectory}/images`,
        enabled: media.enabled,
      }),
      new GeminiVideoProvider({
        apiKey: apiKey || undefined,
        settings: resolveGeminiVideoSettings({
          model: videoModel,
          durationSeconds: media.video.durationSeconds,
          resolution: media.video.resolution,
          pollingIntervalMs: media.pollingIntervalMs,
          timeoutMs: media.timeoutMs,
          retryCount: media.retryCount,
          outputDirectory: `${media.outputDirectory}/video`,
          enabled: media.enabled,
        }),
      }),
    ];
    for (const provider of defaults) this.register(provider);
    for (const provider of options.providers ?? []) this.register(provider);
  }

  register(provider: AssetProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: AssetProviderId): AssetProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Unknown asset provider: ${id}`);
    }
    return provider;
  }

  has(id: AssetProviderId): boolean {
    return this.providers.has(id);
  }

  list(): AssetProvider[] {
    return [...this.providers.values()];
  }

  listIds(): AssetProviderId[] {
    return [...this.providers.keys()];
  }
}

export function createDefaultAssetRegistry(
  options?: AssetProviderRegistryOptions,
): AssetProviderRegistry {
  return new AssetProviderRegistry(options);
}
