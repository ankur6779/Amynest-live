import type {
  ContentEngineConfig,
  ResolvedPublishingConfig,
} from "../types/index.js";
import type { PublishingEngineSettings } from "../types/published-video.js";

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return fallback;
}

export const DEFAULT_PUBLISHING_SETTINGS: PublishingEngineSettings = {
  publishingProvider: "mock",
  defaultVisibility: "private",
  playlist: "AmyNest Shorts",
  uploadRetries: 3,
  notificationChannels: ["webhook"],
  schedulePolicy: {
    mode: "immediate",
    timezone: "Asia/Kolkata",
    uploadOffsetMinutes: 0,
  },
  categoryId: "22",
  license: "youtube",
  // Parent/caregiver audience — never force Made for Kids.
  madeForKids: false,
  // AmyNest Shorts use AI visuals/narration; disclose unless explicitly disabled.
  aiDisclosure: true,
  retryBaseDelayMs: 250,
  retryMaxDelayMs: 8_000,
  deadLetterEnabled: true,
};

/** Merge Phase 6 publishing defaults (backward compatible). */
export function resolvePublishingSettings(
  config: ContentEngineConfig,
): ResolvedPublishingConfig {
  const schedulePolicy = {
    ...DEFAULT_PUBLISHING_SETTINGS.schedulePolicy,
    timezone:
      config.schedulePolicy?.timezone ??
      config.timezone ??
      DEFAULT_PUBLISHING_SETTINGS.schedulePolicy.timezone,
    mode: config.schedulePolicy?.mode ?? DEFAULT_PUBLISHING_SETTINGS.schedulePolicy.mode,
    uploadOffsetMinutes:
      config.schedulePolicy?.uploadOffsetMinutes ??
      DEFAULT_PUBLISHING_SETTINGS.schedulePolicy.uploadOffsetMinutes,
  };

  return {
    ...config,
    publishingProvider:
      config.publishingProvider ?? DEFAULT_PUBLISHING_SETTINGS.publishingProvider,
    defaultVisibility:
      config.defaultVisibility ?? DEFAULT_PUBLISHING_SETTINGS.defaultVisibility,
    playlist: config.playlist ?? DEFAULT_PUBLISHING_SETTINGS.playlist,
    uploadRetries: config.uploadRetries ?? DEFAULT_PUBLISHING_SETTINGS.uploadRetries,
    notificationChannels:
      config.notificationChannels ?? DEFAULT_PUBLISHING_SETTINGS.notificationChannels,
    schedulePolicy,
    categoryId: config.categoryId ?? DEFAULT_PUBLISHING_SETTINGS.categoryId,
    license: config.license ?? DEFAULT_PUBLISHING_SETTINGS.license,
    madeForKids:
      config.madeForKids ??
      envBool("YOUTUBE_MADE_FOR_KIDS", DEFAULT_PUBLISHING_SETTINGS.madeForKids),
    aiDisclosure:
      config.aiDisclosure ??
      envBool("YOUTUBE_AI_DISCLOSURE", DEFAULT_PUBLISHING_SETTINGS.aiDisclosure),
    retryBaseDelayMs:
      config.retryBaseDelayMs ?? DEFAULT_PUBLISHING_SETTINGS.retryBaseDelayMs,
    retryMaxDelayMs:
      config.retryMaxDelayMs ?? DEFAULT_PUBLISHING_SETTINGS.retryMaxDelayMs,
    deadLetterEnabled:
      config.deadLetterEnabled ?? DEFAULT_PUBLISHING_SETTINGS.deadLetterEnabled,
  };
}
