import type { TrendProviderId } from "../../types/campaign-plan.js";
import { FutureTrendProvider } from "./future.js";
import { GoogleTrendsProvider } from "./google.js";
import { MockTrendProvider } from "./mock.js";
import type { TrendProvider } from "./types.js";
import { YouTubeTrendsProvider } from "./youtube.js";

export interface TrendProviderRegistryOptions {
  providers?: TrendProvider[];
}

export class TrendProviderRegistry {
  private readonly providers = new Map<TrendProviderId, TrendProvider>();

  constructor(options: TrendProviderRegistryOptions = {}) {
    const defaults: TrendProvider[] = [
      new MockTrendProvider(),
      new GoogleTrendsProvider(),
      new YouTubeTrendsProvider(),
      new FutureTrendProvider(),
    ];
    for (const provider of defaults) this.register(provider);
    for (const provider of options.providers ?? []) this.register(provider);
  }

  register(provider: TrendProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: TrendProviderId): TrendProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown trend provider: ${id}`);
    return provider;
  }

  list(): TrendProvider[] {
    return [...this.providers.values()];
  }

  async resolveProvider(primary: TrendProviderId): Promise<TrendProvider> {
    const first = this.get(primary);
    const health = await first.health();
    if (health.ok) return first;
    return this.get("mock");
  }
}

export function createDefaultTrendRegistry(
  options?: TrendProviderRegistryOptions,
): TrendProviderRegistry {
  return new TrendProviderRegistry(options);
}
