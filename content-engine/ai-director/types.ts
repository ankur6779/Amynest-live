/**
 * AI Director types — additive film-direction layer.
 * Runs after approved script / golden script, before scene generation.
 * Does not redefine workflow phases.
 */

import type { BrandCharacterId } from "../brand/types.js";
import type {
  CameraMove,
  SceneEmotion,
  TransitionType,
} from "../types/storyboard.js";

export const AI_DIRECTOR_VERSION = "1.0.0";

/** Mirrors ComposerBeatRole — kept local to avoid circular imports. */
export type DirectorBeatRole =
  | "hook"
  | "problem"
  | "emotion"
  | "feature"
  | "transformation"
  | "cta"
  | "end-card"
  | "bridge";

/** Professional shot language — chosen by the director, not left to chance. */
export type DirectorShotType =
  | "Establishing Shot"
  | "Wide Shot"
  | "Medium Shot"
  | "Close-Up"
  | "Extreme Close-Up"
  | "Over-the-Shoulder"
  | "POV"
  | "Tracking Shot"
  | "Push-In"
  | "Pull-Out"
  | "Orbit"
  | "Top-Down"
  | "Low Angle"
  | "High Angle"
  | "Insert Shot"
  | "Reaction Shot";

export type ShotSize =
  | "wide"
  | "medium"
  | "close-up"
  | "extreme-close-up"
  | "macro";

export type CameraAngle =
  | "eye-level"
  | "low-angle"
  | "high-angle"
  | "top-down"
  | "over-the-shoulder"
  | "pov";

export type DirectorCameraMovement =
  | "static-hold"
  | "slow-push-in"
  | "gentle-pull-out"
  | "tracking"
  | "orbit"
  | "tilt-reveal"
  | "parallax-drift";

export type LightingMood =
  | "warm-intimate"
  | "soft-daylight"
  | "hopeful-sunrise"
  | "calm-twilight"
  | "playful-rim"
  | "cosmic-soft"
  | "end-card-glow";

export type ColorTemperature =
  | "warm-golden"
  | "neutral-day"
  | "cool-calm"
  | "purple-accent-warm";

export type ScenePacing = "urgent" | "measured" | "lingering" | "celebratory" | "settle";

export type TargetEmotionLabel =
  | "Parent frustration"
  | "Child hesitation"
  | "Hope"
  | "Curiosity"
  | "Confidence"
  | "Joy"
  | "Calm reassurance"
  | "Pride"
  | "Bonding"
  | "Relief";

export interface SceneEmotionBeat {
  sceneIndex: number;
  role: DirectorBeatRole;
  targetEmotion: TargetEmotionLabel;
  /** Emotional intensity 1–10. */
  intensity: number;
  facialExpression: string;
  bodyLanguage: string;
  eyeDirection: string;
  audienceFeeling: string;
  /** Mapped into existing composer emotion enum. */
  composerEmotion: SceneEmotion;
}

export interface DirectedCameraPlan {
  shotType: DirectorShotType;
  shotSize: ShotSize;
  angle: CameraAngle;
  movement: DirectorCameraMovement;
  /** Compatible with existing ComposerSceneIntent.camera */
  composerCamera: CameraMove;
  framing: string;
  subjectFraming: string;
}

export interface DirectedLightingPlan {
  mood: LightingMood;
  colorTemperature: ColorTemperature;
  keyLight: string;
  notes: string;
}

export interface DirectedBlocking {
  characters: BrandCharacterId[];
  positions: string;
  wardrobeLock: string;
  objectPlacement: string;
}

export interface DirectedScenePlan {
  sceneId: string;
  index: number;
  role: DirectorBeatRole;
  objective: string;
  camera: DirectedCameraPlan;
  lighting: DirectedLightingPlan;
  blocking: DirectedBlocking;
  emotion: SceneEmotionBeat;
  pacing: ScenePacing;
  microActions: string[];
  motionPlan: string;
  timingSeconds: number;
  continuityNotes: string[];
  transitionOut: {
    type: TransitionType;
    note: string;
  };
}

export interface VisualContinuityBible {
  timeOfDay: string;
  roomLayout: string;
  wardrobe: string;
  lightingLanguage: string;
  palette: string;
  eyeLine: string;
  cameraDirection: string;
  objectPlacement: string;
  characterPositions: string;
}

export interface DirectorQualityResult {
  ok: boolean;
  cinematicScore: number;
  rejects: Array<{
    sceneId: string;
    reason: string;
    code:
      | "powerpoint"
      | "slideshow"
      | "static-image"
      | "talking-head"
      | "generic-ai"
      | "continuity-break"
      | "missing-micro-action"
      | "ok";
  }>;
  summary: string;
}

export interface DirectorPackage {
  id: string;
  version: typeof AI_DIRECTOR_VERSION;
  createdAt: string;
  title: string;
  category: string;
  /** High-level film objective for the short. */
  filmObjective: string;
  emotionMap: SceneEmotionBeat[];
  scenes: DirectedScenePlan[];
  cameraPlanSummary: string[];
  lightingPlanSummary: string[];
  motionPlanSummary: string[];
  transitionPlan: Array<{
    fromSceneId: string;
    toSceneId: string;
    type: TransitionType;
    note: string;
  }>;
  timing: Array<{ sceneId: string; seconds: number; pacing: ScenePacing }>;
  visualContinuity: VisualContinuityBible;
  quality: DirectorQualityResult;
}
