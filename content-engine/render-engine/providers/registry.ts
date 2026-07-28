import type { RenderProviderId } from "../../types/render-package.js";
import { FFmpegRenderer } from "./ffmpeg.js";
import { FutureRenderer } from "./future.js";
import { MockRenderer } from "./mock.js";
import { RemotionRenderer } from "./remotion.js";
import type { RenderProvider } from "./types.js";

export type ProviderFallbackMode = "mock" | "none";

export interface RenderProviderRegistryOptions {
  providers?: RenderProvider[];
  fallbackMode?: ProviderFallbackMode;
}

export class RenderProviderRegistry {
  private readonly providers = new Map<RenderProviderId, RenderProvider>();
  private readonly fallbackMode: ProviderFallbackMode;

  constructor(options: RenderProviderRegistryOptions = {}) {
    this.fallbackMode = options.fallbackMode ?? "mock";
    const defaults: RenderProvider[] = [
      new MockRenderer(),
      new FFmpegRenderer(),
      new RemotionRenderer(),
      new FutureRenderer(),
    ];
    for (const provider of defaults) this.register(provider);
    for (const provider of options.providers ?? []) this.register(provider);
  }

  register(provider: RenderProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: RenderProviderId): RenderProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown render provider: ${id}`);
    return provider;
  }

  has(id: RenderProviderId): boolean {
    return this.providers.has(id);
  }

  list(): RenderProvider[] {
    return [...this.providers.values()];
  }

  async resolveProvider(
    primary: RenderProviderId,
    preferred: RenderProviderId,
  ): Promise<RenderProvider> {
    const first = this.get(primary);
    const health = await first.health();
    if (health.ok) return first;
    if (preferred !== primary && this.has(preferred)) {
      const second = this.get(preferred);
      const secondHealth = await second.health();
      if (secondHealth.ok) return second;
    }
    if (this.fallbackMode === "none") {
      throw new Error(
        `Render provider '${primary}' unhealthy: ${health.message ?? "unknown error"}`,
      );
    }
    return this.get("mock");
  }
}

export function createDefaultRenderRegistry(
  options?: RenderProviderRegistryOptions,
): RenderProviderRegistry {
  return new RenderProviderRegistry(options);
}
