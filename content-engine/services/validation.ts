import { assertValidUploadTime, resolveVideosPerDay } from "../config/index.js";
import type {
  ContentEngineConfig,
  DaySlot,
  Topic,
  ValidationIssue,
  ValidationResult,
  WeekCalendar,
} from "../types/index.js";
import {
  AGE_GROUPS,
  DAYS_OF_WEEK,
  DIFFICULTIES,
  TOPIC_CATEGORIES,
  VIDEO_STYLES,
} from "../types/index.js";

function issue(
  path: string,
  message: string,
  severity: ValidationIssue["severity"] = "error",
): ValidationIssue {
  return { path, message, severity };
}

export function validateTopic(topic: Topic, index?: number): ValidationIssue[] {
  const prefix = index === undefined ? `topic[${topic.id}]` : `topics[${index}]`;
  const issues: ValidationIssue[] = [];

  if (!topic.id?.trim()) issues.push(issue(`${prefix}.id`, "id is required"));
  if (!topic.title?.trim()) issues.push(issue(`${prefix}.title`, "title is required"));
  if (!(TOPIC_CATEGORIES as readonly string[]).includes(topic.category)) {
    issues.push(issue(`${prefix}.category`, `unknown category: ${topic.category}`));
  }
  if (!(DIFFICULTIES as readonly string[]).includes(topic.difficulty)) {
    issues.push(issue(`${prefix}.difficulty`, `invalid difficulty: ${topic.difficulty}`));
  }
  if (!(AGE_GROUPS as readonly string[]).includes(topic.ageGroup)) {
    issues.push(issue(`${prefix}.ageGroup`, `invalid ageGroup: ${topic.ageGroup}`));
  }
  if (!(VIDEO_STYLES as readonly string[]).includes(topic.videoStyle)) {
    issues.push(issue(`${prefix}.videoStyle`, `invalid videoStyle: ${topic.videoStyle}`));
  }
  if (!Array.isArray(topic.keywords) || topic.keywords.length === 0) {
    issues.push(issue(`${prefix}.keywords`, "keywords must be a non-empty array"));
  }
  if (!topic.cta?.trim()) issues.push(issue(`${prefix}.cta`, "cta is required"));
  if (!Number.isFinite(topic.priority) || topic.priority < 1 || topic.priority > 10) {
    issues.push(issue(`${prefix}.priority`, "priority must be between 1 and 10"));
  }
  if (!Number.isFinite(topic.estimatedDuration) || topic.estimatedDuration <= 0) {
    issues.push(
      issue(`${prefix}.estimatedDuration`, "estimatedDuration must be a positive number"),
    );
  }

  return issues;
}

export function validateTopics(topics: readonly Topic[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  if (topics.length < 150) {
    issues.push(
      issue("topics", `expected at least 150 topics, found ${topics.length}`, "warning"),
    );
  }

  topics.forEach((topic, index) => {
    issues.push(...validateTopic(topic, index));
    if (seen.has(topic.id)) {
      issues.push(issue(`topics[${index}].id`, `duplicate topic id: ${topic.id}`));
    }
    seen.add(topic.id);
  });

  const missingCategories = TOPIC_CATEGORIES.filter(
    (cat) => !topics.some((t) => t.category === cat),
  );
  for (const cat of missingCategories) {
    issues.push(issue("topics.categories", `missing category coverage: ${cat}`));
  }

  return {
    ok: issues.every((i) => i.severity !== "error"),
    issues,
  };
}

export function validateConfig(config: ContentEngineConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  try {
    assertValidUploadTime(config.uploadTime);
  } catch (err) {
    issues.push(issue("uploadTime", err instanceof Error ? err.message : String(err)));
  }

  if (!config.timezone?.trim()) {
    issues.push(issue("timezone", "timezone is required"));
  }
  if (!config.language?.trim()) {
    issues.push(issue("language", "language is required"));
  }

  if (typeof config.videosPerDay === "number") {
    if (config.videosPerDay < 0) {
      issues.push(issue("videosPerDay", "videosPerDay must be >= 0"));
    }
  } else if (config.videosPerDay && typeof config.videosPerDay === "object") {
    for (const day of DAYS_OF_WEEK) {
      const n = resolveVideosPerDay(config, day);
      if (n < 0) issues.push(issue(`videosPerDay.${day}`, "must be >= 0"));
    }
  } else {
    issues.push(issue("videosPerDay", "videosPerDay must be a number or per-day map"));
  }

  if (!Array.isArray(config.preferredCategories) || config.preferredCategories.length === 0) {
    issues.push(issue("preferredCategories", "preferredCategories must be non-empty"));
  } else {
    for (const cat of config.preferredCategories) {
      if (!(TOPIC_CATEGORIES as readonly string[]).includes(cat)) {
        issues.push(issue("preferredCategories", `unknown category: ${cat}`));
      }
    }
  }

  if (!config.enabledFeatures || typeof config.enabledFeatures !== "object") {
    issues.push(issue("enabledFeatures", "enabledFeatures is required"));
  }

  if (!Number.isFinite(config.rotationWindowDays) || config.rotationWindowDays < 1) {
    issues.push(issue("rotationWindowDays", "rotationWindowDays must be >= 1"));
  }

  if (!config.music || typeof config.music !== "object") {
    issues.push(issue("music", "music config is required"));
  } else if (config.music.volume < 0 || config.music.volume > 1) {
    issues.push(issue("music.volume", "volume must be between 0 and 1"));
  }

  if (!config.branding?.channelName?.trim()) {
    issues.push(issue("branding.channelName", "channelName is required"));
  }

  if (config.scriptProvider !== undefined) {
    const allowed = ["mock", "openai", "future"];
    if (!allowed.includes(config.scriptProvider)) {
      issues.push(
        issue("scriptProvider", `scriptProvider must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (config.maxRetries !== undefined && (!Number.isFinite(config.maxRetries) || config.maxRetries < 0)) {
    issues.push(issue("maxRetries", "maxRetries must be >= 0"));
  }

  if (config.cacheTTL !== undefined && (!Number.isFinite(config.cacheTTL) || config.cacheTTL < 1)) {
    issues.push(issue("cacheTTL", "cacheTTL must be >= 1 second"));
  }

  if (
    config.minimumQualityScore !== undefined &&
    (config.minimumQualityScore < 0 || config.minimumQualityScore > 100)
  ) {
    issues.push(issue("minimumQualityScore", "minimumQualityScore must be 0–100"));
  }

  if (
    config.minimumSEOScore !== undefined &&
    (config.minimumSEOScore < 0 || config.minimumSEOScore > 100)
  ) {
    issues.push(issue("minimumSEOScore", "minimumSEOScore must be 0–100"));
  }

  if (config.aspectRatio !== undefined) {
    const allowed = ["9:16", "16:9", "1:1"];
    if (!allowed.includes(config.aspectRatio)) {
      issues.push(issue("aspectRatio", `aspectRatio must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.fps !== undefined && (!Number.isFinite(config.fps) || config.fps <= 0)) {
    issues.push(issue("fps", "fps must be a positive number"));
  }

  if (config.animationLevel !== undefined) {
    const allowed = ["subtle", "balanced", "expressive"];
    if (!allowed.includes(config.animationLevel)) {
      issues.push(
        issue("animationLevel", `animationLevel must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (config.cameraStyle !== undefined) {
    const allowed = ["static-first", "cinematic", "dynamic"];
    if (!allowed.includes(config.cameraStyle)) {
      issues.push(issue("cameraStyle", `cameraStyle must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.maximumAIAssets !== undefined && (!Number.isFinite(config.maximumAIAssets) || config.maximumAIAssets < 0)) {
    issues.push(issue("maximumAIAssets", "maximumAIAssets must be >= 0"));
  }

  if (
    config.reuseThreshold !== undefined &&
    (config.reuseThreshold < 0 || config.reuseThreshold > 1)
  ) {
    issues.push(issue("reuseThreshold", "reuseThreshold must be between 0 and 1"));
  }

  if (config.allowFallbacks !== undefined && typeof config.allowFallbacks !== "boolean") {
    issues.push(issue("allowFallbacks", "allowFallbacks must be a boolean"));
  }

  if (config.renderer !== undefined) {
    const allowed = ["mock", "ffmpeg", "remotion", "future"];
    if (!allowed.includes(config.renderer)) {
      issues.push(issue("renderer", `renderer must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.preferredRenderer !== undefined) {
    const allowed = ["mock", "ffmpeg", "remotion", "future"];
    if (!allowed.includes(config.preferredRenderer)) {
      issues.push(
        issue(
          "preferredRenderer",
          `preferredRenderer must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (config.codec !== undefined) {
    const allowed = ["h264", "h265", "vp9", "prores"];
    if (!allowed.includes(config.codec)) {
      issues.push(issue("codec", `codec must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.audioCodec !== undefined) {
    const allowed = ["aac", "opus", "pcm_s16le"];
    if (!allowed.includes(config.audioCodec)) {
      issues.push(issue("audioCodec", `audioCodec must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.outputContainer !== undefined) {
    const allowed = ["mp4", "mov", "webm"];
    if (!allowed.includes(config.outputContainer)) {
      issues.push(
        issue("outputContainer", `outputContainer must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (config.subtitleMode !== undefined) {
    const allowed = ["srt", "ass", "burned-in", "none"];
    if (!allowed.includes(config.subtitleMode)) {
      issues.push(
        issue("subtitleMode", `subtitleMode must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (config.hardwareAcceleration !== undefined) {
    const allowed = ["none", "auto", "videotoolbox", "nvenc", "qsv"];
    if (!allowed.includes(config.hardwareAcceleration)) {
      issues.push(
        issue(
          "hardwareAcceleration",
          `hardwareAcceleration must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (config.watermark !== undefined && typeof config.watermark !== "boolean") {
    issues.push(issue("watermark", "watermark must be a boolean"));
  }

  if (
    config.bitrate !== undefined &&
    (typeof config.bitrate !== "string" || !config.bitrate.trim())
  ) {
    issues.push(issue("bitrate", "bitrate must be a non-empty string"));
  }

  if (config.publishingProvider !== undefined) {
    const allowed = ["mock", "youtube", "future"];
    if (!allowed.includes(config.publishingProvider)) {
      issues.push(
        issue(
          "publishingProvider",
          `publishingProvider must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (config.defaultVisibility !== undefined) {
    const allowed = ["private", "unlisted", "public", "draft"];
    if (!allowed.includes(config.defaultVisibility)) {
      issues.push(
        issue(
          "defaultVisibility",
          `defaultVisibility must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (
    config.uploadRetries !== undefined &&
    (!Number.isFinite(config.uploadRetries) || config.uploadRetries < 0)
  ) {
    issues.push(issue("uploadRetries", "uploadRetries must be >= 0"));
  }

  if (config.notificationChannels !== undefined) {
    if (!Array.isArray(config.notificationChannels)) {
      issues.push(issue("notificationChannels", "notificationChannels must be an array"));
    } else {
      const allowed = ["telegram", "email", "webhook", "slack", "discord"];
      for (const channel of config.notificationChannels) {
        if (!allowed.includes(channel)) {
          issues.push(
            issue(
              "notificationChannels",
              `unknown notification channel: ${String(channel)}`,
            ),
          );
        }
      }
    }
  }

  if (config.schedulePolicy !== undefined) {
    if (typeof config.schedulePolicy !== "object" || config.schedulePolicy === null) {
      issues.push(issue("schedulePolicy", "schedulePolicy must be an object"));
    } else if (
      config.schedulePolicy.mode !== undefined &&
      !["immediate", "scheduled", "draft"].includes(config.schedulePolicy.mode)
    ) {
      issues.push(
        issue("schedulePolicy.mode", "schedulePolicy.mode must be immediate, scheduled, or draft"),
      );
    }
  }

  if (config.license !== undefined) {
    const allowed = ["youtube", "creativeCommon"];
    if (!allowed.includes(config.license)) {
      issues.push(issue("license", `license must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.madeForKids !== undefined && typeof config.madeForKids !== "boolean") {
    issues.push(issue("madeForKids", "madeForKids must be a boolean"));
  }

  if (
    config.retryBaseDelayMs !== undefined &&
    (!Number.isFinite(config.retryBaseDelayMs) || config.retryBaseDelayMs < 0)
  ) {
    issues.push(issue("retryBaseDelayMs", "retryBaseDelayMs must be >= 0"));
  }

  if (
    config.retryMaxDelayMs !== undefined &&
    (!Number.isFinite(config.retryMaxDelayMs) || config.retryMaxDelayMs < 0)
  ) {
    issues.push(issue("retryMaxDelayMs", "retryMaxDelayMs must be >= 0"));
  }

  if (
    config.workflowConcurrency !== undefined &&
    (!Number.isFinite(config.workflowConcurrency) || config.workflowConcurrency < 1)
  ) {
    issues.push(issue("workflowConcurrency", "workflowConcurrency must be >= 1"));
  }

  if (
    config.maximumRetries !== undefined &&
    (!Number.isFinite(config.maximumRetries) || config.maximumRetries < 0)
  ) {
    issues.push(issue("maximumRetries", "maximumRetries must be >= 0"));
  }

  if (
    config.dailyVideoCount !== undefined &&
    (!Number.isFinite(config.dailyVideoCount) || config.dailyVideoCount < 1)
  ) {
    issues.push(issue("dailyVideoCount", "dailyVideoCount must be >= 1"));
  }

  if (config.queueMode !== undefined && !["fifo", "priority"].includes(config.queueMode)) {
    issues.push(issue("queueMode", "queueMode must be fifo or priority"));
  }

  if (
    config.resumeOnFailure !== undefined &&
    typeof config.resumeOnFailure !== "boolean"
  ) {
    issues.push(issue("resumeOnFailure", "resumeOnFailure must be a boolean"));
  }

  if (
    config.parallelRendering !== undefined &&
    typeof config.parallelRendering !== "boolean"
  ) {
    issues.push(issue("parallelRendering", "parallelRendering must be a boolean"));
  }

  if (config.analyticsProvider !== undefined) {
    const allowed = ["mock", "youtube", "future"];
    if (!allowed.includes(config.analyticsProvider)) {
      issues.push(
        issue(
          "analyticsProvider",
          `analyticsProvider must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (config.reportSchedule !== undefined) {
    const allowed = ["daily", "weekly", "monthly"];
    if (!allowed.includes(config.reportSchedule)) {
      issues.push(
        issue("reportSchedule", `reportSchedule must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (
    config.minimumSampleSize !== undefined &&
    (!Number.isFinite(config.minimumSampleSize) || config.minimumSampleSize < 1)
  ) {
    issues.push(issue("minimumSampleSize", "minimumSampleSize must be >= 1"));
  }

  if (
    config.learningRetentionDays !== undefined &&
    (!Number.isFinite(config.learningRetentionDays) || config.learningRetentionDays < 1)
  ) {
    issues.push(issue("learningRetentionDays", "learningRetentionDays must be >= 1"));
  }

  if (
    config.optimizationEnabled !== undefined &&
    typeof config.optimizationEnabled !== "boolean"
  ) {
    issues.push(issue("optimizationEnabled", "optimizationEnabled must be a boolean"));
  }

  if (
    config.campaignPlanningEnabled !== undefined &&
    typeof config.campaignPlanningEnabled !== "boolean"
  ) {
    issues.push(
      issue("campaignPlanningEnabled", "campaignPlanningEnabled must be a boolean"),
    );
  }

  if (config.trendProvider !== undefined) {
    const allowed = ["mock", "google-trends", "youtube-trends", "future"];
    if (!allowed.includes(config.trendProvider)) {
      issues.push(
        issue("trendProvider", `trendProvider must be one of ${allowed.join(", ")}`),
      );
    }
  }

  if (
    config.abTestingEnabled !== undefined &&
    typeof config.abTestingEnabled !== "boolean"
  ) {
    issues.push(issue("abTestingEnabled", "abTestingEnabled must be a boolean"));
  }

  if (
    config.predictionEnabled !== undefined &&
    typeof config.predictionEnabled !== "boolean"
  ) {
    issues.push(issue("predictionEnabled", "predictionEnabled must be a boolean"));
  }

  if (
    config.learningWindowDays !== undefined &&
    (!Number.isFinite(config.learningWindowDays) || config.learningWindowDays < 1)
  ) {
    issues.push(issue("learningWindowDays", "learningWindowDays must be >= 1"));
  }

  if (
    config.confidenceThreshold !== undefined &&
    (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)
  ) {
    issues.push(issue("confidenceThreshold", "confidenceThreshold must be between 0 and 1"));
  }

  if (
    config.seasonalCalendar !== undefined &&
    (typeof config.seasonalCalendar !== "string" || !config.seasonalCalendar.trim())
  ) {
    issues.push(issue("seasonalCalendar", "seasonalCalendar must be a non-empty string"));
  }

  if (config.runtimeEnvironment !== undefined) {
    const allowed = ["development", "staging", "production", "local"];
    if (!allowed.includes(config.runtimeEnvironment)) {
      issues.push(
        issue(
          "runtimeEnvironment",
          `runtimeEnvironment must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (config.opsLogLevel !== undefined) {
    const allowed = ["debug", "info", "warn", "error"];
    if (!allowed.includes(config.opsLogLevel)) {
      issues.push(issue("opsLogLevel", `opsLogLevel must be one of ${allowed.join(", ")}`));
    }
  }

  if (config.schedulerBackend !== undefined) {
    const allowed = ["cron", "coolify", "docker", "systemd", "cloud"];
    if (!allowed.includes(config.schedulerBackend)) {
      issues.push(
        issue(
          "schedulerBackend",
          `schedulerBackend must be one of ${allowed.join(", ")}`,
        ),
      );
    }
  }

  if (
    config.secretValidationMode !== undefined &&
    !["strict", "permissive"].includes(config.secretValidationMode)
  ) {
    issues.push(
      issue("secretValidationMode", "secretValidationMode must be strict or permissive"),
    );
  }

  if (
    config.minimumDiskFreeMb !== undefined &&
    (!Number.isFinite(config.minimumDiskFreeMb) || config.minimumDiskFreeMb < 0)
  ) {
    issues.push(issue("minimumDiskFreeMb", "minimumDiskFreeMb must be >= 0"));
  }

  if (
    config.maximumMemoryUsagePercent !== undefined &&
    (config.maximumMemoryUsagePercent < 1 || config.maximumMemoryUsagePercent > 100)
  ) {
    issues.push(
      issue(
        "maximumMemoryUsagePercent",
        "maximumMemoryUsagePercent must be between 1 and 100",
      ),
    );
  }

  if (
    config.dailyCron !== undefined &&
    (typeof config.dailyCron !== "string" ||
      config.dailyCron.trim().split(/\s+/).length !== 5)
  ) {
    issues.push(issue("dailyCron", "dailyCron must be a 5-field cron expression"));
  }

  return {
    ok: issues.every((i) => i.severity !== "error"),
    issues,
  };
}

export function validateWeekCalendar(calendar: WeekCalendar): ValidationResult {
  const issues: ValidationIssue[] = [];
  const slotIds = new Set<string>();

  for (const day of DAYS_OF_WEEK) {
    const slots = calendar[day];
    if (!Array.isArray(slots)) {
      issues.push(issue(`calendar.${day}`, "must be an array of slots"));
      continue;
    }
    if (slots.length === 0) {
      issues.push(issue(`calendar.${day}`, "has no slots", "warning"));
    }
    slots.forEach((slot: DaySlot, index) => {
      const path = `calendar.${day}[${index}]`;
      if (!slot.slotId?.trim()) issues.push(issue(`${path}.slotId`, "slotId is required"));
      if (slot.slotId && slotIds.has(slot.slotId)) {
        issues.push(issue(`${path}.slotId`, `duplicate slotId: ${slot.slotId}`));
      }
      if (slot.slotId) slotIds.add(slot.slotId);
      if (!slot.label?.trim()) issues.push(issue(`${path}.label`, "label is required"));
      if (!Array.isArray(slot.preferredCategories) || slot.preferredCategories.length === 0) {
        issues.push(
          issue(`${path}.preferredCategories`, "preferredCategories must be non-empty"),
        );
      }
    });
  }

  return {
    ok: issues.every((i) => i.severity !== "error"),
    issues,
  };
}
