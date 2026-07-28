/**
 * AmyNest Production Scene Composer types.
 * Additive layer — does not redefine workflow phases.
 */

import type { BrandCharacterId } from "../brand/types.js";
import type {
  CameraMove,
  SceneEmotion,
  ScenePurpose,
  SupportedDuration,
  TransitionType,
  VisualType,
} from "../types/storyboard.js";

/** Known / future video generation providers — capability-driven, not hardwired. */
export type VideoClipProviderId =
  | "google-veo"
  | "gemini-video"
  | "openai-video"
  | "runway"
  | "pika"
  | "luma"
  | "mock"
  | "future";

export interface VideoProviderCapabilities {
  providerId: VideoClipProviderId;
  /** Hard max length of a single generated clip (seconds). */
  maxClipSeconds: number;
  /** Preferred discrete durations the provider accepts (optional). */
  allowedClipSeconds?: number[];
  /** Minimum clip length. */
  minClipSeconds: number;
  supportsAudio: boolean;
  supportsVertical: boolean;
  label: string;
}

export type ComposerBeatRole =
  | "hook"
  | "problem"
  | "emotion"
  | "feature"
  | "transformation"
  | "cta"
  | "end-card"
  | "bridge";

export interface ComposerSceneIntent {
  index: number;
  role: ComposerBeatRole;
  goal: string;
  /** Target duration before provider snap. */
  targetSeconds: number;
  /** Duration after snapping to provider limits. */
  durationSeconds: number;
  narration: string;
  caption: string;
  emotion: SceneEmotion;
  characters: BrandCharacterId[];
  camera: CameraMove;
  visualType: VisualType;
  storyboardPurpose: ScenePurpose;
}

export interface SceneContinuityContext {
  previousSceneId: string | null;
  currentSceneId: string;
  nextSceneId: string | null;
  previousGoal: string | null;
  nextGoal: string | null;
  sharedLighting: string;
  sharedPalette: string;
  sharedIdentityLock: string;
  cameraHandoff: string;
}

export interface ComposerScenePrompt {
  sceneId: string;
  systemBrandBlock: string;
  userPrompt: string;
  negativePrompt: string;
  continuity: SceneContinuityContext;
  durationSeconds: number;
  characters: BrandCharacterId[];
}

export type SceneValidationCode =
  | "low-quality"
  | "wrong-character"
  | "wrong-colors"
  | "brand-violation"
  | "safety"
  | "bad-animation"
  | "low-resolution"
  | "incorrect-duration"
  | "identity-drift"
  | "ok";

export interface SceneValidationResult {
  sceneId: string;
  ok: boolean;
  code: SceneValidationCode;
  message: string;
  shouldRegenerate: boolean;
  retryPromptHint?: string;
}

export interface ComposerTransition {
  fromSceneId: string;
  toSceneId: string;
  type: TransitionType;
  durationSeconds: number;
  brandPurpleWash: boolean;
}

export interface ComposerAudioPlan {
  narrationSegments: Array<{
    sceneId: string;
    start: number;
    end: number;
    text: string;
    emotion: SceneEmotion;
  }>;
  subtitleCues: Array<{
    sceneId: string;
    start: number;
    end: number;
    text: string;
  }>;
  music: {
    mood: string;
    duckingLevel: number;
    bedHint: string;
  };
  soundEffects: Array<{
    sceneId: string;
    at: number;
    hint: string;
  }>;
}

export interface ComposerEndCardPlan {
  required: true;
  durationSeconds: number;
  appIcon: true;
  googlePlayBadge: true;
  appleAppStoreBadge: true;
  websiteUrl: string;
  lines: string[];
}

export interface ComposerScene {
  sceneId: string;
  intent: ComposerSceneIntent;
  prompt: ComposerScenePrompt;
  validation: SceneValidationResult;
  clipPath?: string;
  regenerateAttempts: number;
}

export interface SceneComposerPackage {
  id: string;
  version: string;
  createdAt: string;
  totalDuration: SupportedDuration;
  targetResolution: "1080x1920";
  aspectRatio: "9:16";
  provider: VideoProviderCapabilities;
  scenes: ComposerScene[];
  transitions: ComposerTransition[];
  audio: ComposerAudioPlan;
  endCard: ComposerEndCardPlan;
  timeline: {
    clips: Array<{
      sceneId: string;
      start: number;
      end: number;
      duration: number;
    }>;
    totalSeconds: number;
  };
  stitch: {
    seamless: true;
    method: "xfade-concat" | "concat";
    outputHint: "platform-ready-vertical-short";
  };
  validation: {
    ok: boolean;
    failedSceneIds: string[];
    messages: string[];
  };
}

export const SCENE_COMPOSER_VERSION = "1.0.0";
