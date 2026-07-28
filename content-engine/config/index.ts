import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentEngineConfig, DayOfWeek } from "../types/index.js";
import { DAYS_OF_WEEK } from "../types/index.js";
import { resolveAssetEngineSettings } from "./asset-engine.js";
import { resolveGenerationSettings } from "./generation.js";
import { resolveAnalyticsSettings } from "./analytics.js";
import { resolveBrainSettings } from "./brain.js";
import { resolveOperationsSettings } from "./operations.js";
import { resolvePublishingSettings } from "./publishing.js";
import { resolveRenderEngineSettings } from "./render-engine.js";
import { resolveStoryboardSettings } from "./storyboard.js";
import { resolveWorkflowSettings } from "./workflow.js";

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));

/** Default engine config (JSON). */
export const DEFAULT_CONFIG_PATH = join(CONFIG_DIR, "default.json");

export function loadConfigFromJson(
  raw: unknown,
): ContentEngineConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("Content engine config must be a JSON object");
  }
  return raw as ContentEngineConfig;
}

export function loadDefaultConfig(): ContentEngineConfig {
  const text = readFileSync(DEFAULT_CONFIG_PATH, "utf8");
  return loadConfigFromJson(JSON.parse(text));
}

/** Load defaults with Phase 2 generation fields fully resolved. */
export function loadResolvedConfig() {
  return resolveGenerationSettings(loadDefaultConfig());
}

/** Load defaults with Phase 2 + Phase 3 storyboard fields resolved. */
export function loadResolvedStoryboardConfig() {
  return resolveStoryboardSettings(resolveGenerationSettings(loadDefaultConfig()));
}

/** Load defaults with Phase 2–4 fields resolved. */
export function loadResolvedAssetEngineConfig() {
  return resolveAssetEngineSettings(
    resolveStoryboardSettings(resolveGenerationSettings(loadDefaultConfig())),
  );
}

/** Load defaults with Phase 2–5 fields resolved. */
export function loadResolvedRenderEngineConfig() {
  return resolveRenderEngineSettings(
    resolveAssetEngineSettings(
      resolveStoryboardSettings(resolveGenerationSettings(loadDefaultConfig())),
    ),
  );
}

/** Load defaults with Phase 2–6 fields resolved. */
export function loadResolvedPublishingConfig() {
  return resolvePublishingSettings(loadResolvedRenderEngineConfig());
}

/** Load defaults with Phase 2–7 fields resolved. */
export function loadResolvedWorkflowConfig() {
  return resolveWorkflowSettings(loadResolvedPublishingConfig());
}

/** Load defaults with Phase 2–8 fields resolved. */
export function loadResolvedAnalyticsConfig() {
  return resolveAnalyticsSettings(loadResolvedWorkflowConfig());
}

/** Load defaults with Phase 2–9 fields resolved. */
export function loadResolvedBrainConfig() {
  return resolveBrainSettings(loadResolvedAnalyticsConfig());
}

/** Load defaults with Phase 2–10 fields resolved. */
export function loadResolvedOpsConfig() {
  return resolveOperationsSettings(loadResolvedBrainConfig());
}

export {
  DEFAULT_GENERATION_SETTINGS,
  resolveGenerationSettings,
} from "./generation.js";

export {
  DEFAULT_STORYBOARD_SETTINGS,
  resolveStoryboardSettings,
} from "./storyboard.js";

export {
  DEFAULT_ASSET_ENGINE_SETTINGS,
  resolveAssetEngineSettings,
} from "./asset-engine.js";

export {
  DEFAULT_RENDER_ENGINE_SETTINGS,
  resolveRenderEngineSettings,
} from "./render-engine.js";

export {
  DEFAULT_PUBLISHING_SETTINGS,
  resolvePublishingSettings,
} from "./publishing.js";

export {
  DEFAULT_WORKFLOW_SETTINGS,
  resolveWorkflowSettings,
} from "./workflow.js";

export {
  DEFAULT_ANALYTICS_SETTINGS,
  resolveAnalyticsSettings,
} from "./analytics.js";

export {
  DEFAULT_BRAIN_SETTINGS,
  resolveBrainSettings,
} from "./brain.js";

export {
  DEFAULT_OPERATIONS_SETTINGS,
  resolveOperationsSettings,
} from "./operations.js";

/** Resolve how many videos to publish on a given weekday. */
export function resolveVideosPerDay(
  config: ContentEngineConfig,
  day: DayOfWeek,
): number {
  if (typeof config.videosPerDay === "number") {
    return Math.max(0, Math.floor(config.videosPerDay));
  }
  const override = config.videosPerDay[day];
  if (typeof override === "number") {
    return Math.max(0, Math.floor(override));
  }
  return 1;
}

export function assertValidUploadTime(uploadTime: string): void {
  if (!/^\d{2}:\d{2}$/.test(uploadTime)) {
    throw new Error(`uploadTime must be HH:mm, got: ${uploadTime}`);
  }
  const [hh, mm] = uploadTime.split(":").map(Number);
  if (hh! < 0 || hh! > 23 || mm! < 0 || mm! > 59) {
    throw new Error(`uploadTime out of range: ${uploadTime}`);
  }
}

export function isDayOfWeek(value: string): value is DayOfWeek {
  return (DAYS_OF_WEEK as readonly string[]).includes(value);
}
