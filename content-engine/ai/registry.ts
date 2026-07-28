import type { ContentEngineConfig, ScriptProviderId } from "../types/index.js";
import { resolveGeminiMediaSettings } from "../config/gemini-media.js";
import { ContentEngineError } from "./errors.js";
import { FutureProvider } from "./future-provider.js";
import { GeminiProvider } from "./gemini-provider.js";
import { MockProvider } from "./mock-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import type { AIProvider } from "./provider.js";

export interface ProviderRegistryOptions {
  providers?: AIProvider[];
  config?: ContentEngineConfig;
}

/** Resolve and switch AI providers via configuration. */
export class ProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  constructor(options: ProviderRegistryOptions = {}) {
    const geminiMedia = resolveGeminiMediaSettings(options.config);
    const defaults: AIProvider[] = [
      new MockProvider(),
      new GeminiProvider({
        apiKeyEnv: options.config?.gemini?.apiKeyEnv ?? geminiMedia.apiKeyEnv,
        model: options.config?.gemini?.model ?? geminiMedia.script.model,
        fallbackModel: geminiMedia.script.fallbackModel,
        baseUrl: options.config?.gemini?.baseUrl ?? geminiMedia.baseUrl,
      }),
      new OpenAIProvider({
        apiKeyEnv: options.config?.openai?.apiKeyEnv ?? "OPENAI_API_KEY",
        model: options.config?.openai?.model,
        baseUrl: options.config?.openai?.baseUrl,
      }),
      new FutureProvider(),
    ];

    for (const provider of defaults) {
      this.register(provider);
    }
    for (const provider of options.providers ?? []) {
      this.register(provider);
    }
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): AIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new ContentEngineError(
        "CONFIG_ERROR",
        `Unknown AI provider: ${id}`,
        { recoverable: false },
      );
    }
    return provider;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): AIProvider[] {
    return [...this.providers.values()];
  }

  resolvePrimary(config: ContentEngineConfig): AIProvider {
    const id = (config.scriptProvider ?? "mock") as ScriptProviderId;
    return this.get(id);
  }

  resolveFallback(config: ContentEngineConfig): AIProvider | undefined {
    const id = config.fallbackProvider ?? "mock";
    if (!this.has(id)) return undefined;
    const primary = config.scriptProvider ?? "mock";
    if (id === primary) return undefined;
    return this.get(id);
  }
}

export function createDefaultProviderRegistry(
  config?: ContentEngineConfig,
): ProviderRegistry {
  return new ProviderRegistry({ config });
}
