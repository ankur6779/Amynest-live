/**
 * Cost-first provider selection — Offline → Cache → API Last.
 * Does not change pipeline/render/publish/validator architecture.
 */

import type { ContentEngineConfig } from "../types/index.js";
import type { AssetProviderId } from "../types/asset-package.js";

/** Provider order when AI media is allowed — still local/cache first. */
export const COST_FIRST_PREFERRED_PROVIDERS: AssetProviderId[] = [
  "local-library",
  "screen-recording",
  "illustration",
  "placeholder",
  "openai-images",
  "google-imagen",
  "google-veo",
];

/** Provider order when high-cost media is explicitly opted in. */
export const COST_FIRST_MEDIA_OPT_IN_PROVIDERS: AssetProviderId[] = [
  "local-library",
  "screen-recording",
  "illustration",
  "google-imagen",
  "google-veo",
  "openai-images",
  "placeholder",
];

export function isCostFirstEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.AMYNEST_COST_FIRST?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") {
    return false;
  }
  // Default ON — every API call is expensive.
  return true;
}

/**
 * Apply Offline-First → Cache-First → API-Last provider selection.
 * Idempotent; preserves explicit AMYNEST_SCRIPT_PROVIDER when set.
 */
export function applyCostFirstProviderSelection(
  config: ContentEngineConfig,
  env: NodeJS.ProcessEnv = process.env,
): ContentEngineConfig {
  if (!isCostFirstEnabled(env)) return config;

  const next: ContentEngineConfig = { ...config };
  const explicitScript = env.AMYNEST_SCRIPT_PROVIDER?.trim();

  // Text / planning: local mock (Golden Scripts + templates). Never default to Gemini/OpenAI.
  if (explicitScript === "gemini" || explicitScript === "openai" || explicitScript === "mock") {
    next.scriptProvider = explicitScript;
  } else {
    next.scriptProvider = "mock";
  }
  next.fallbackProvider = "mock";

  const mediaOptIn =
    env.AMYNEST_GEMINI_ENABLED === "true" || env.AMYNEST_VEO_ENABLED === "true";

  next.preferredProviders = mediaOptIn
    ? mergeProviders(
        COST_FIRST_MEDIA_OPT_IN_PROVIDERS,
        next.preferredProviders,
      )
    : mergeProviders(COST_FIRST_PREFERRED_PROVIDERS, next.preferredProviders);

  next.assetPriority = next.assetPriority ?? [
    "local-library",
    "cache",
    "screen-recording",
    "ai-image",
    "fallback-placeholder",
  ];

  // Cap AI asset spend unless explicitly raised.
  if (next.maximumAIAssets == null || next.maximumAIAssets > 4) {
    next.maximumAIAssets = mediaOptIn ? 4 : 2;
  }

  // Stronger reuse / cache bias.
  next.reuseThreshold = Math.max(next.reuseThreshold ?? 0.85, 0.85);
  next.cachePolicy = {
    ttlSeconds: next.cachePolicy?.ttlSeconds ?? next.cacheTTL ?? 86_400,
    version: next.cachePolicy?.version ?? "4.0.0",
    invalidateOnFingerprintMismatch:
      next.cachePolicy?.invalidateOnFingerprintMismatch ?? true,
  };

  return next;
}

function mergeProviders(
  preferred: AssetProviderId[],
  existing?: AssetProviderId[],
): AssetProviderId[] {
  const seen = new Set<AssetProviderId>();
  const out: AssetProviderId[] = [];
  for (const id of [...preferred, ...(existing ?? [])]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
