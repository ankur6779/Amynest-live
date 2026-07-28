import type { CaptionSegment, ContentPackage } from "./content-package.js";
import type { Topic } from "./index.js";

export const STORYBOARD_PACKAGE_VERSION = "3.0.0";

export const SUPPORTED_DURATIONS = [15, 20, 30] as const;
export type SupportedDuration = (typeof SUPPORTED_DURATIONS)[number];

export type AspectRatio = "9:16" | "16:9" | "1:1";
export type ResolutionPreset = "1080x1920" | "1920x1080" | "1080x1080";

export type VisualType =
  | "Promo Image"
  | "App Screen"
  | "Screen Recording"
  | "Illustration"
  | "AI Image"
  | "Future AI Video"
  | "Motion Background"
  | "Gradient Background"
  | "Icon Animation";

export type CameraMove =
  | "Static"
  | "Zoom In"
  | "Zoom Out"
  | "Pan Left"
  | "Pan Right"
  | "Tilt"
  | "Push"
  | "Pull"
  | "Hold";

export type TransitionType =
  | "Cut"
  | "Fade"
  | "Crossfade"
  | "Slide"
  | "Zoom"
  | "Dissolve";

export type TransitionCurve = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export type TransitionDirection =
  | "none"
  | "left"
  | "right"
  | "up"
  | "down"
  | "in"
  | "out";

export type OverlayKind =
  | "Headline"
  | "Subtitle"
  | "CTA"
  | "Badge"
  | "Label"
  | "Logo"
  | "Progress"
  | "Lower Third";

export type AnimationKind =
  | "Fade"
  | "Scale"
  | "Bounce"
  | "Slide"
  | "Typewriter"
  | "Pulse"
  | "Float";

export type ScenePurpose =
  | "hook"
  | "opening-question"
  | "story"
  | "key-point"
  | "cta"
  | "brand-end";

export type SceneEmotion =
  | "curious"
  | "warm"
  | "calm"
  | "energized"
  | "hopeful"
  | "confident";

export type BrandingMode = "full" | "minimal" | "watermark-only";
export type AnimationLevel = "subtle" | "balanced" | "expressive";
export type CameraStyle = "static-first" | "cinematic" | "dynamic";

export interface SafeMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StoryboardSettings {
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  fps: number;
  defaultTransitions: TransitionType[];
  brandingMode: BrandingMode;
  animationLevel: AnimationLevel;
  cameraStyle: CameraStyle;
  safeMargins: SafeMargins;
}

export interface TimelineClip {
  sceneId: string;
  sceneStart: number;
  sceneEnd: number;
  duration: number;
}

export interface TimelinePlan {
  totalDuration: SupportedDuration;
  clips: TimelineClip[];
}

export interface CameraPlanItem {
  sceneId: string;
  move: CameraMove;
  intensity: number;
  start: number;
  end: number;
}

export interface TransitionPlanItem {
  fromSceneId: string;
  toSceneId: string;
  type: TransitionType;
  duration: number;
  curve: TransitionCurve;
  direction: TransitionDirection;
  at: number;
}

export interface AnimationPlanItem {
  id: string;
  sceneId: string;
  target: "scene" | "overlay" | "caption" | "logo";
  kind: AnimationKind;
  start: number;
  end: number;
  easing: TransitionCurve;
  params: Record<string, number | string>;
}

export interface OverlayPlanItem {
  id: string;
  sceneId: string;
  kind: OverlayKind;
  text: string;
  position: {
    x: number;
    y: number;
    anchor: "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
  };
  fontSize: number;
  animation: AnimationKind;
  start: number;
  end: number;
  duration: number;
}

export interface AssetRequirement {
  assetId: string;
  sceneId: string;
  requiredAssetType: VisualType;
  imagePrompt: string;
  videoPrompt: string;
  screenRecordingTemplate: string;
  fallbackAsset: string;
  priority: number;
}

export interface ScenePlan {
  sceneId: string;
  purpose: ScenePurpose;
  visualType: VisualType;
  background: string;
  camera: CameraMove;
  transition: TransitionType;
  caption: string;
  voice: string;
  animation: AnimationKind;
  priority: number;
  emotion: SceneEmotion;
  duration: number;
  assetRequirements: AssetRequirement[];
}

export interface MusicSegmentPlan {
  id: string;
  role: "intro" | "main" | "outro";
  start: number;
  end: number;
  energy: number;
  mood: string;
  ducking: boolean;
  trackHint: string;
}

export interface MusicPlan {
  enabled: boolean;
  defaultTrackId: string;
  segments: MusicSegmentPlan[];
  duckingLevel: number;
}

export interface VoicePlanItem {
  sceneId: string;
  start: number;
  end: number;
  text: string;
  emotion: SceneEmotion;
  pace: "slow" | "moderate" | "brisk";
}

export interface VoicePlan {
  items: VoicePlanItem[];
  totalSpokenSeconds: number;
}

export interface CaptionPlanItem {
  sceneId: string;
  captionId: string;
  start: number;
  end: number;
  text: string;
  style: CaptionSegment["style"];
  position: CaptionSegment["position"];
}

export interface CaptionPlan {
  items: CaptionPlanItem[];
}

export interface BrandingPlan {
  channelName: string;
  logoAssetId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    display: string;
    body: string;
  };
  cta: string;
  watermark: boolean;
  watermarkPosition: "top-right" | "bottom-right";
  qrPlaceholder: string;
  playStorePlaceholder: string;
  mode: BrandingMode;
}

export interface RenderHints {
  preferGpu: boolean;
  maxBitrateKbps: number;
  audioSampleRate: number;
  captionBurnIn: boolean;
  colorSpace: "rec709";
  futureRenderFormat: "amynest-render-v1";
}

export interface StoryboardValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface StoryboardValidationReport {
  ok: boolean;
  errors: StoryboardValidationIssue[];
  warnings: StoryboardValidationIssue[];
}

export interface StoryboardPackage {
  id: string;
  version: string;
  createdAt: string;
  topic: Topic;
  contentPackageVersion: string;
  totalDuration: SupportedDuration;
  aspectRatio: AspectRatio;
  fps: number;
  resolution: ResolutionPreset;
  branding: BrandingPlan;
  timeline: TimelinePlan;
  scenes: ScenePlan[];
  assets: AssetRequirement[];
  musicPlan: MusicPlan;
  voicePlan: VoicePlan;
  captionPlan: CaptionPlan;
  transitionPlan: TransitionPlanItem[];
  cameraPlan: CameraPlanItem[];
  overlayPlan: OverlayPlanItem[];
  animationPlan: AnimationPlanItem[];
  renderHints: RenderHints;
  validation: StoryboardValidationReport;
  source: {
    title: string;
    language: string;
    videoStyle: string;
    provider: string;
  };
}

export type ExportFormat = "json" | "yaml" | "amynest-render-v1";

export interface StoryboardExportResult {
  format: ExportFormat;
  content: string;
  contentType: string;
}

/** Input for storyboard planning from a Phase 2 ContentPackage. */
export interface StoryboardPlanningInput {
  contentPackage: ContentPackage;
  duration?: SupportedDuration;
}
