import type { AssetProviderId } from "../../types/asset-package.js";
import {
  createDefaultAiProviders,
  GeminiVideoProvider,
  IllustrationProvider,
  LocalLibraryProvider,
  PlaceholderProvider,
  ScreenRecordingProvider,
  type AssetProvider,
} from "../providers/index.js";

export interface AssetProviderRegistryOptions {
  providers?: AssetProvider[];
}

/** Registry of asset providers — orchestration depends only on interfaces. */
export class AssetProviderRegistry {
  private readonly providers = new Map<AssetProviderId, AssetProvider>();

  constructor(options: AssetProviderRegistryOptions = {}) {
    const defaults: AssetProvider[] = [
      new LocalLibraryProvider(),
      new ScreenRecordingProvider(),
      new IllustrationProvider(),
      new PlaceholderProvider(),
      ...createDefaultAiProviders(),
      new GeminiVideoProvider(),
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
