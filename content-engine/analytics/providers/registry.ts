import type { AnalyticsProviderId } from "../../types/analytics.js";
import { FutureAnalyticsProvider } from "./future.js";
import { MockAnalyticsProvider } from "./mock.js";
import type { AnalyticsProvider } from "./types.js";
import { YouTubeAnalyticsProvider } from "./youtube.js";

export type ProviderFallbackMode = "mock" | "none";

export interface AnalyticsProviderRegistryOptions {
  providers?: AnalyticsProvider[];
  fallbackMode?: ProviderFallbackMode;
}

export class AnalyticsProviderRegistry {
  private readonly providers = new Map<AnalyticsProviderId, AnalyticsProvider>();
  private readonly fallbackMode: ProviderFallbackMode;

  constructor(options: AnalyticsProviderRegistryOptions = {}) {
    this.fallbackMode = options.fallbackMode ?? "mock";
    const defaults: AnalyticsProvider[] = [
      new MockAnalyticsProvider(),
      new YouTubeAnalyticsProvider(),
      new FutureAnalyticsProvider(),
    ];
    for (const provider of defaults) this.register(provider);
    for (const provider of options.providers ?? []) this.register(provider);
  }

  register(provider: AnalyticsProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: AnalyticsProviderId): AnalyticsProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown analytics provider: ${id}`);
    return provider;
  }

  has(id: AnalyticsProviderId): boolean {
    return this.providers.has(id);
  }

  list(): AnalyticsProvider[] {
    return [...this.providers.values()];
  }

  async resolveProvider(primary: AnalyticsProviderId): Promise<AnalyticsProvider> {
    const first = this.get(primary);
    const health = await first.health();
    if (health.ok) return first;
    if (this.fallbackMode === "none") {
      throw new Error(
        `Analytics provider '${primary}' unhealthy: ${health.message ?? "unknown error"}`,
      );
    }
    return this.get("mock");
  }
}

export function createDefaultAnalyticsRegistry(
  options?: AnalyticsProviderRegistryOptions,
): AnalyticsProviderRegistry {
  return new AnalyticsProviderRegistry(options);
}
