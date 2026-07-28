import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ContentEngineConfig,
  ResolvedRenderEngineConfig,
} from "../types/index.js";
import type { RenderEngineSettings } from "../types/render-package.js";

export const DEFAULT_RENDER_ENGINE_SETTINGS: RenderEngineSettings = {
  renderer: "mock",
  preferredRenderer: "ffmpeg",
  fps: 30,
  bitrate: "8M",
  codec: "h264",
  audioCodec: "aac",
  outputDirectory: join(tmpdir(), "amynest-renders"),
  hardwareAcceleration: "auto",
  subtitleMode: "burned-in",
  watermark: true,
  outputContainer: "mp4",
};

/** Merge Phase 5 render-engine defaults (backward compatible). */
export function resolveRenderEngineSettings(
  config: ContentEngineConfig,
): ResolvedRenderEngineConfig {
  return {
    ...config,
    renderer: config.renderer ?? DEFAULT_RENDER_ENGINE_SETTINGS.renderer,
    preferredRenderer:
      config.preferredRenderer ?? DEFAULT_RENDER_ENGINE_SETTINGS.preferredRenderer,
    fps: config.fps ?? DEFAULT_RENDER_ENGINE_SETTINGS.fps,
    bitrate: config.bitrate ?? DEFAULT_RENDER_ENGINE_SETTINGS.bitrate,
    codec: config.codec ?? DEFAULT_RENDER_ENGINE_SETTINGS.codec,
    audioCodec: config.audioCodec ?? DEFAULT_RENDER_ENGINE_SETTINGS.audioCodec,
    outputDirectory:
      config.outputDirectory ?? DEFAULT_RENDER_ENGINE_SETTINGS.outputDirectory,
    hardwareAcceleration:
      config.hardwareAcceleration ??
      DEFAULT_RENDER_ENGINE_SETTINGS.hardwareAcceleration,
    subtitleMode: config.subtitleMode ?? DEFAULT_RENDER_ENGINE_SETTINGS.subtitleMode,
    watermark: config.watermark ?? DEFAULT_RENDER_ENGINE_SETTINGS.watermark,
    outputContainer:
      config.outputContainer ?? DEFAULT_RENDER_ENGINE_SETTINGS.outputContainer,
  };
}
