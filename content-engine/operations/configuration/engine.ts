import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfigFromJson, loadDefaultConfig } from "../../config/index.js";
import { resolveOperationsSettings } from "../../config/operations.js";
import { validateConfig } from "../../services/validation.js";
import type { ContentEngineConfig, ValidationResult } from "../../types/index.js";
import type { RuntimeEnvironment } from "../../types/operations.js";

export interface ConfigurationLoadOptions {
  /** Absolute or relative JSON path. */
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  runtimeOverrides?: Partial<ContentEngineConfig>;
  environment?: RuntimeEnvironment;
}

export interface LoadedConfiguration {
  config: ContentEngineConfig;
  environment: RuntimeEnvironment;
  sources: Array<"defaults" | "json" | "env" | "runtime">;
  validation: ValidationResult;
}

/**
 * Configuration precedence: Defaults → JSON → Environment Variables → Runtime Overrides.
 */
export function loadLayeredConfiguration(
  options: ConfigurationLoadOptions = {},
): LoadedConfiguration {
  const env = options.env ?? process.env;
  const sources: LoadedConfiguration["sources"] = ["defaults"];
  let config: ContentEngineConfig = loadDefaultConfig();

  const jsonPath =
    options.configPath ??
    env.AMYNEST_CONFIG_PATH ??
    env.CONTENT_ENGINE_CONFIG;
  if (jsonPath && existsSync(resolve(jsonPath))) {
    const raw = JSON.parse(readFileSync(resolve(jsonPath), "utf8")) as unknown;
    config = { ...config, ...loadConfigFromJson(raw) };
    sources.push("json");
  }

  const fromEnv = applyEnvironmentOverrides(config, env);
  if (fromEnv.changed) {
    config = fromEnv.config;
    sources.push("env");
  }

  if (options.runtimeOverrides && Object.keys(options.runtimeOverrides).length > 0) {
    config = { ...config, ...options.runtimeOverrides };
    sources.push("runtime");
  }

  const environment =
    options.environment ??
    parseEnvironment(env.AMYNEST_ENV ?? env.NODE_ENV) ??
    config.runtimeEnvironment ??
    "local";

  config = resolveOperationsSettings({
    ...config,
    runtimeEnvironment: environment,
  });

  return {
    config,
    environment,
    sources,
    validation: validateConfig(config),
  };
}

export function applyEnvironmentOverrides(
  config: ContentEngineConfig,
  env: NodeJS.ProcessEnv,
): { config: ContentEngineConfig; changed: boolean } {
  const next: ContentEngineConfig = { ...config };
  let changed = false;

  const map: Array<[keyof ContentEngineConfig, string, (v: string) => unknown]> = [
    ["timezone", "AMYNEST_TIMEZONE", String],
    ["uploadTime", "AMYNEST_UPLOAD_TIME", String],
    ["scriptProvider", "AMYNEST_SCRIPT_PROVIDER", String],
    ["renderer", "AMYNEST_RENDERER", String],
    ["publishingProvider", "AMYNEST_PUBLISHING_PROVIDER", String],
    ["analyticsProvider", "AMYNEST_ANALYTICS_PROVIDER", String],
    ["trendProvider", "AMYNEST_TREND_PROVIDER", String],
    ["runtimeEnvironment", "AMYNEST_ENV", String],
    ["opsLogLevel", "AMYNEST_LOG_LEVEL", String],
    ["dataDirectory", "AMYNEST_DATA_DIR", String],
    ["backupDirectory", "AMYNEST_BACKUP_DIR", String],
    ["dailyCron", "AMYNEST_DAILY_CRON", String],
    ["schedulerBackend", "AMYNEST_SCHEDULER_BACKEND", String],
    ["outputDirectory", "AMYNEST_OUTPUT_DIR", String],
    ["defaultVisibility", "AMYNEST_DEFAULT_VISIBILITY", String],
    ["secretValidationMode", "AMYNEST_SECRET_VALIDATION_MODE", String],
    ["providerFallbackMode", "AMYNEST_PROVIDER_FALLBACK_MODE", String],
    ["fallbackProvider", "AMYNEST_FALLBACK_PROVIDER", String],
  ];

  for (const [key, envKey, cast] of map) {
    const raw = env[envKey];
    if (raw === undefined || raw === "") continue;
    (next as unknown as Record<string, unknown>)[key as string] = cast(raw);
    changed = true;
  }

  if (env.AMYNEST_DAILY_VIDEO_COUNT) {
    next.dailyVideoCount = Number(env.AMYNEST_DAILY_VIDEO_COUNT);
    changed = true;
  }
  if (env.AMYNEST_WORKFLOW_CONCURRENCY) {
    next.workflowConcurrency = Number(env.AMYNEST_WORKFLOW_CONCURRENCY);
    changed = true;
  }
  if (env.AMYNEST_HEALTHCHECK_ENABLED) {
    next.healthcheckEnabled = env.AMYNEST_HEALTHCHECK_ENABLED === "true";
    changed = true;
  }
  if (env.AMYNEST_MONITORING_ENABLED) {
    next.monitoringEnabled = env.AMYNEST_MONITORING_ENABLED === "true";
    changed = true;
  }
  if (env.AMYNEST_BACKUP_ENABLED) {
    next.backupEnabled = env.AMYNEST_BACKUP_ENABLED === "true";
    changed = true;
  }

  /** Opt-in only: key presence alone must not enable Gemini/Veo in daily production. */
  const geminiOptIn =
    env.AMYNEST_GEMINI_ENABLED === "true" || env.AMYNEST_VEO_ENABLED === "true";
  if (
    geminiOptIn &&
    (env.GEMINI_API_KEY?.trim() || env.GOOGLE_AI_API_KEY?.trim())
  ) {
    const preferred = new Set(next.preferredProviders ?? []);
    preferred.add("google-veo");
    preferred.add("google-imagen");
    next.preferredProviders = [
      "google-imagen",
      "google-veo",
      ...[...preferred].filter((p) => p !== "google-veo" && p !== "google-imagen"),
    ];
    next.maximumAIAssets = Math.max(next.maximumAIAssets ?? 2, 3);
    if (env.AMYNEST_GEMINI_ENABLED === "true") {
      next.scriptProvider = "gemini";
      next.fallbackProvider = next.fallbackProvider === "gemini" ? "openai" : next.fallbackProvider ?? "openai";
      next.geminiMedia = {
        ...(next.geminiMedia ?? {}),
        enabled: true,
      };
    }
    next.geminiVideo = {
      ...(next.geminiVideo ?? {}),
      enabled: env.AMYNEST_VEO_ENABLED === "false" ? false : true,
      ...(env.AMYNEST_VEO_MODEL ? { model: env.AMYNEST_VEO_MODEL } : {}),
      ...(env.AMYNEST_VEO_OUTPUT_DIR
        ? { outputDirectory: env.AMYNEST_VEO_OUTPUT_DIR }
        : {}),
    };
    changed = true;
  }

  return { config: next, changed };
}

export function parseEnvironment(value?: string): RuntimeEnvironment | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "prod") return "production";
  if (normalized === "dev") return "development";
  if (
    normalized === "development" ||
    normalized === "staging" ||
    normalized === "production" ||
    normalized === "local"
  ) {
    return normalized;
  }
  return undefined;
}
