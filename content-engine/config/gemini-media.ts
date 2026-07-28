import type { ContentEngineConfig } from "../types/index.js";
import {
  DEFAULT_GEMINI_MEDIA_SETTINGS,
  resolveVideoModelId,
  type GeminiMediaStackSettings,
} from "../types/gemini-media.js";

export function resolveGeminiMediaSettings(
  config?: ContentEngineConfig,
  env: NodeJS.ProcessEnv = process.env,
): GeminiMediaStackSettings {
  const partial = config?.geminiMedia ?? {};
  const videoPartial: Partial<GeminiMediaStackSettings["video"]> =
    partial.video ?? {};
  const tier =
    (env.AMYNEST_VEO_TIER as GeminiMediaStackSettings["video"]["tier"] | undefined) ??
    videoPartial.tier ??
    DEFAULT_GEMINI_MEDIA_SETTINGS.video.tier;

  const settings: GeminiMediaStackSettings = {
    ...DEFAULT_GEMINI_MEDIA_SETTINGS,
    ...partial,
    apiKeyEnv: partial.apiKeyEnv ?? env.AMYNEST_VEO_API_KEY_ENV ?? "GEMINI_API_KEY",
    baseUrl:
      partial.baseUrl ??
      env.AMYNEST_GEMINI_BASE_URL ??
      DEFAULT_GEMINI_MEDIA_SETTINGS.baseUrl,
    enabled:
      partial.enabled ??
      (env.AMYNEST_GEMINI_ENABLED === undefined
        ? DEFAULT_GEMINI_MEDIA_SETTINGS.enabled
        : env.AMYNEST_GEMINI_ENABLED === "true"),
    maxConcurrentJobs:
      partial.maxConcurrentJobs ??
      (env.AMYNEST_GEMINI_MAX_CONCURRENT
        ? Number(env.AMYNEST_GEMINI_MAX_CONCURRENT)
        : DEFAULT_GEMINI_MEDIA_SETTINGS.maxConcurrentJobs),
    pollingIntervalMs:
      partial.pollingIntervalMs ??
      (env.AMYNEST_VEO_POLL_MS
        ? Number(env.AMYNEST_VEO_POLL_MS)
        : DEFAULT_GEMINI_MEDIA_SETTINGS.pollingIntervalMs),
    timeoutMs:
      partial.timeoutMs ??
      (env.AMYNEST_VEO_TIMEOUT_MS
        ? Number(env.AMYNEST_VEO_TIMEOUT_MS)
        : DEFAULT_GEMINI_MEDIA_SETTINGS.timeoutMs),
    retryCount:
      partial.retryCount ??
      (env.AMYNEST_VEO_RETRY_COUNT
        ? Number(env.AMYNEST_VEO_RETRY_COUNT)
        : DEFAULT_GEMINI_MEDIA_SETTINGS.retryCount),
    outputDirectory:
      partial.outputDirectory ??
      env.AMYNEST_GEMINI_OUTPUT_DIR ??
      DEFAULT_GEMINI_MEDIA_SETTINGS.outputDirectory,
    script: {
      ...DEFAULT_GEMINI_MEDIA_SETTINGS.script,
      ...(partial.script ?? {}),
      model:
        partial.script?.model ??
        env.AMYNEST_GEMINI_SCRIPT_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.script.model,
      fallbackModel:
        partial.script?.fallbackModel ??
        env.AMYNEST_GEMINI_SCRIPT_FALLBACK_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.script.fallbackModel,
      premiumModel:
        partial.script?.premiumModel ??
        env.AMYNEST_GEMINI_SCRIPT_PREMIUM_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.script.premiumModel,
    },
    image: {
      ...DEFAULT_GEMINI_MEDIA_SETTINGS.image,
      ...(partial.image ?? {}),
      model:
        partial.image?.model ??
        env.AMYNEST_GEMINI_IMAGE_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.image.model,
      premiumModel:
        partial.image?.premiumModel ??
        env.AMYNEST_GEMINI_IMAGE_PREMIUM_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.image.premiumModel,
      fallbackModel:
        partial.image?.fallbackModel ??
        env.AMYNEST_GEMINI_IMAGE_FALLBACK_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.image.fallbackModel,
    },
    video: {
      ...DEFAULT_GEMINI_MEDIA_SETTINGS.video,
      ...videoPartial,
      tier,
      dailyModel:
        videoPartial.dailyModel ??
        env.AMYNEST_VEO_DAILY_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.video.dailyModel,
      premiumModel:
        videoPartial.premiumModel ??
        env.AMYNEST_VEO_PREMIUM_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.video.premiumModel,
      budgetModel:
        videoPartial.budgetModel ??
        env.AMYNEST_VEO_BUDGET_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.video.budgetModel,
      durationSeconds:
        videoPartial.durationSeconds ??
        (env.AMYNEST_VEO_DURATION
          ? (Number(env.AMYNEST_VEO_DURATION) as 4 | 6 | 8)
          : DEFAULT_GEMINI_MEDIA_SETTINGS.video.durationSeconds),
      resolution:
        videoPartial.resolution ??
        (env.AMYNEST_VEO_RESOLUTION as "720p" | "1080p" | undefined) ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.video.resolution,
    },
    voice: {
      ...DEFAULT_GEMINI_MEDIA_SETTINGS.voice,
      ...(partial.voice ?? {}),
      model:
        partial.voice?.model ??
        env.AMYNEST_GEMINI_TTS_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.voice.model,
      fallbackModel:
        partial.voice?.fallbackModel ??
        env.AMYNEST_GEMINI_TTS_FALLBACK_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.voice.fallbackModel,
      voiceName:
        partial.voice?.voiceName ??
        env.AMYNEST_GEMINI_TTS_VOICE ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.voice.voiceName,
    },
    music: {
      ...DEFAULT_GEMINI_MEDIA_SETTINGS.music,
      ...(partial.music ?? {}),
      enabled:
        partial.music?.enabled ??
        env.AMYNEST_GEMINI_MUSIC_ENABLED === "true",
      model:
        partial.music?.model ??
        env.AMYNEST_GEMINI_MUSIC_MODEL ??
        DEFAULT_GEMINI_MEDIA_SETTINGS.music.model,
    },
  };

  // Keep geminiVideo model in sync with media-stack video tier for Veo provider.
  void resolveVideoModelId(settings.video);
  return settings;
}

export function readGeminiApiKey(
  settings: GeminiMediaStackSettings,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env[settings.apiKeyEnv]?.trim() ||
    env.GEMINI_API_KEY?.trim() ||
    env.GOOGLE_AI_API_KEY?.trim() ||
    ""
  );
}
