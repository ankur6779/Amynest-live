import type { AssetPackage } from "./asset-package.js";
import type { StoryboardPackage, TransitionType } from "./storyboard.js";

export const RENDER_PACKAGE_VERSION = "5.0.0";

export type RenderProviderId = "mock" | "ffmpeg" | "remotion" | "future";

export type OutputContainer = "mp4" | "mov" | "webm";
export type VideoCodec = "h264" | "h265" | "vp9" | "prores";
export type AudioCodec = "aac" | "opus" | "pcm_s16le";
export type SubtitleMode = "srt" | "ass" | "burned-in" | "none";
export type HardwareAcceleration = "none" | "auto" | "videotoolbox" | "nvenc" | "qsv";

export type RenderProgressStage =
  | "queued"
  | "preparing"
  | "rendering"
  | "encoding"
  | "optimizing"
  | "completed"
  | "failed";

export interface RenderEngineSettings {
  renderer: RenderProviderId;
  preferredRenderer: RenderProviderId;
  fps: number;
  bitrate: string;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  outputDirectory: string;
  hardwareAcceleration: HardwareAcceleration;
  subtitleMode: SubtitleMode;
  watermark: boolean;
  outputContainer: OutputContainer;
}

export interface RenderProgressEvent {
  stage: RenderProgressStage;
  progress: number;
  message: string;
  at: string;
  details?: Record<string, string | number | boolean>;
}

export interface FrameTimelineClip {
  sceneId: string;
  startFrame: number;
  endFrame: number;
  startSeconds: number;
  endSeconds: number;
  durationFrames: number;
  durationSeconds: number;
}

export interface FrameTimeline {
  fps: number;
  totalFrames: number;
  totalSeconds: number;
  clips: FrameTimelineClip[];
}

export interface TransitionSpec {
  fromSceneId: string;
  toSceneId: string;
  type: TransitionType;
  durationSeconds: number;
  atFrame: number;
  durationFrames: number;
}

export type VisualSourceKind =
  | "image"
  | "video"
  | "screen-recording"
  | "motion-background"
  | "solid"
  | "gradient";

export interface VisualLayer {
  sceneId: string;
  sourceKind: VisualSourceKind;
  sourcePath: string;
  assetId?: string;
  color?: string;
  gradient?: { from: string; to: string };
  startFrame: number;
  endFrame: number;
}

export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
  sceneId: string;
}

export interface SubtitlePlan {
  mode: SubtitleMode;
  cues: SubtitleCue[];
  srtPath?: string;
  assPath?: string;
  safeMargins: { top: number; right: number; bottom: number; left: number };
}

export interface AudioTrackSpec {
  id: string;
  role: "narration" | "music" | "sfx";
  path: string;
  startSeconds: number;
  endSeconds: number;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  ducking: boolean;
}

export interface AudioMixPlan {
  tracks: AudioTrackSpec[];
  normalize: boolean;
  masterVolume: number;
  duckingLevel: number;
}

export interface WatermarkSpec {
  enabled: boolean;
  logoPath: string;
  ctaText: string;
  qrPath: string;
  playStorePath: string;
  endCardEnabled: boolean;
  position: "top-right" | "bottom-right";
}

export interface CompositionPlan {
  width: number;
  height: number;
  fps: number;
  timeline: FrameTimeline;
  visuals: VisualLayer[];
  transitions: TransitionSpec[];
  subtitles: SubtitlePlan;
  audio: AudioMixPlan;
  watermark: WatermarkSpec;
  outputContainer: OutputContainer;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  bitrate: string;
}

export interface RenderJobRequest {
  jobId: string;
  storyboard: StoryboardPackage;
  assets: AssetPackage;
  composition: CompositionPlan;
  outputPath: string;
  hardwareAcceleration: HardwareAcceleration;
  cancelSignal?: AbortSignal;
  onProgress?: (event: RenderProgressEvent) => void;
}

export interface RenderJobResult {
  videoPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  container: OutputContainer;
  checksum: string;
  framesRendered: number;
  droppedFrames: number;
  renderTimeMs: number;
  encodingTimeMs: number;
  provider: RenderProviderId;
  artifacts: {
    srtPath?: string;
    assPath?: string;
    compositionPath?: string;
  };
}

export interface RenderProviderHealth {
  ok: boolean;
  message?: string;
  checkedAt: string;
}

export interface RenderTimeEstimate {
  seconds: number;
  confidence: "low" | "medium" | "high";
}

export interface RenderTelemetry {
  renderTimeMs: number;
  encodingTimeMs: number;
  frames: number;
  droppedFrames: number;
  cpuPercent?: number;
  gpuPercent?: number;
  memoryMb?: number;
  cacheHit: boolean;
  provider: RenderProviderId;
}

export interface RenderMetadata {
  jobId: string;
  storyboardId: string;
  assetPackageId: string;
  compositionFingerprint: string;
  renderer: RenderProviderId;
  outputDirectory: string;
  subtitleMode: SubtitleMode;
  watermarkApplied: boolean;
  createdAt: string;
  artifacts: RenderJobResult["artifacts"];
}

export interface RenderValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface RenderValidationReport {
  ok: boolean;
  errors: RenderValidationIssue[];
  warnings: RenderValidationIssue[];
}

export interface RenderPackage {
  id: string;
  version: string;
  createdAt: string;
  storyboardId: string;
  assetPackageId: string;
  videoPath: string;
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  container: OutputContainer;
  checksum: string;
  renderMetadata: RenderMetadata;
  telemetry: RenderTelemetry;
  validation: RenderValidationReport;
  progressLog: RenderProgressEvent[];
}

export type RenderExportFormat = "json" | "yaml" | "render-manifest-v1";

export interface RenderExportResult {
  format: RenderExportFormat;
  content: string;
  contentType: string;
}

export interface RenderInput {
  storyboard: StoryboardPackage;
  assets: AssetPackage;
}
