import type { PublishingProviderId } from "../../types/published-video.js";
import { FuturePublishingProvider } from "./future.js";
import { MockPublishingProvider } from "./mock.js";
import type { PublishingProvider } from "./types.js";
import { YouTubePublishingProvider } from "./youtube.js";

export type ProviderFallbackMode = "mock" | "none";

export interface PublishingProviderRegistryOptions {
  providers?: PublishingProvider[];
  /** When primary is unhealthy: fall back to mock (default) or fail closed. */
  fallbackMode?: ProviderFallbackMode;
}

export class PublishingProviderRegistry {
  private readonly providers = new Map<PublishingProviderId, PublishingProvider>();
  private readonly fallbackMode: ProviderFallbackMode;

  constructor(options: PublishingProviderRegistryOptions = {}) {
    this.fallbackMode = options.fallbackMode ?? "mock";
    const defaults: PublishingProvider[] = [
      new MockPublishingProvider(),
      new YouTubePublishingProvider(),
      new FuturePublishingProvider(),
    ];
    for (const provider of defaults) this.register(provider);
    for (const provider of options.providers ?? []) this.register(provider);
  }

  register(provider: PublishingProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: PublishingProviderId): PublishingProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown publishing provider: ${id}`);
    return provider;
  }

  has(id: PublishingProviderId): boolean {
    return this.providers.has(id);
  }

  list(): PublishingProvider[] {
    return [...this.providers.values()];
  }

  async resolveProvider(primary: PublishingProviderId): Promise<PublishingProvider> {
    const first = this.get(primary);
    const health = await first.health();
    if (health.ok) return first;
    if (this.fallbackMode === "none") {
      throw new Error(
        `Publishing provider '${primary}' unhealthy: ${health.message ?? "unknown error"}`,
      );
    }
    return this.get("mock");
  }
}

export function createDefaultPublishingRegistry(
  options?: PublishingProviderRegistryOptions,
): PublishingProviderRegistry {
  return new PublishingProviderRegistry(options);
}
