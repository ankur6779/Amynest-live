import type {
  ContentEngineConfig,
  ContentGenerationSettings,
  ResolvedContentEngineConfig,
  ScriptProviderId,
} from "../types/index.js";

export const DEFAULT_GENERATION_SETTINGS: ContentGenerationSettings = {
  scriptProvider: "mock",
  fallbackProvider: "mock",
  defaultLanguage: "en-IN",
  fallbackLanguage: "en",
  maxRetries: 2,
  cacheTTL: 86_400,
  minimumQualityScore: 60,
  minimumSEOScore: 55,
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
  },
};

/** Merge Phase 1 config with Phase 2 generation defaults (backward compatible). */
export function resolveGenerationSettings(
  config: ContentEngineConfig,
): ResolvedContentEngineConfig {
  const scriptProvider = (config.scriptProvider ??
    DEFAULT_GENERATION_SETTINGS.scriptProvider) as ScriptProviderId;
  const fallbackProvider = (config.fallbackProvider ??
    DEFAULT_GENERATION_SETTINGS.fallbackProvider) as ScriptProviderId;

  return {
    ...config,
    scriptProvider,
    fallbackProvider,
    defaultLanguage:
      config.defaultLanguage ??
      config.language ??
      DEFAULT_GENERATION_SETTINGS.defaultLanguage,
    fallbackLanguage:
      config.fallbackLanguage ?? DEFAULT_GENERATION_SETTINGS.fallbackLanguage,
    maxRetries: config.maxRetries ?? DEFAULT_GENERATION_SETTINGS.maxRetries,
    cacheTTL: config.cacheTTL ?? DEFAULT_GENERATION_SETTINGS.cacheTTL,
    minimumQualityScore:
      config.minimumQualityScore ?? DEFAULT_GENERATION_SETTINGS.minimumQualityScore,
    minimumSEOScore:
      config.minimumSEOScore ?? DEFAULT_GENERATION_SETTINGS.minimumSEOScore,
    openai: {
      apiKeyEnv:
        config.openai?.apiKeyEnv ?? DEFAULT_GENERATION_SETTINGS.openai.apiKeyEnv,
      model: config.openai?.model ?? DEFAULT_GENERATION_SETTINGS.openai.model,
      baseUrl: config.openai?.baseUrl ?? DEFAULT_GENERATION_SETTINGS.openai.baseUrl,
    },
  };
}
