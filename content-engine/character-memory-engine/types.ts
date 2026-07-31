/**
 * Character Memory Engine 1.0 — additive continuity layer.
 * Carries approved scene state forward so shorts feel like one film.
 * Prompt + last-frame reference only. No new pipeline / architecture.
 */

import type { BrandCharacterId } from "../brand/types.js";

export const CHARACTER_MEMORY_ENGINE_VERSION = "1.0.0";

export type MemoryRejectCode =
  | "identity-drift"
  | "camera-reset"
  | "prop-disappeared"
  | "lighting-changed"
  | "emotion-jump"
  | "background-changed"
  | "pose-reset"
  | "wardrobe-changed"
  | "ok";

export interface CharacterPoseMemory {
  character: BrandCharacterId;
  position: string;
  bodyOrientation: string;
  eyeDirection: string;
  facialExpression: string;
  handPosition: string;
  activeHand: "left" | "right" | "both" | "none";
  clothing: string;
  hairstyle: string;
  accessories: string;
}

export interface PropMemory {
  id: string;
  description: string;
  owner: BrandCharacterId | "shared" | "environment";
  hand: "left" | "right" | "none";
  placement: string;
}

export interface LightingMemory {
  timeOfDay: string;
  windowDirection: string;
  sunlight: string;
  shadowDirection: string;
  roomBrightness: string;
  mood: string;
}

export interface CameraMemory {
  momentum: string;
  movement: string;
  framingNote: string;
  /** Where the next shot should begin (end of previous push / track). */
  continueFrom: string;
}

export interface EmotionMemory {
  stage: string;
  label: string;
  energy: string;
  previousStage: string | null;
}

export interface SceneCharacterMemory {
  sceneId: string;
  index: number;
  role: string;
  characters: BrandCharacterId[];
  poses: CharacterPoseMemory[];
  props: PropMemory[];
  room: string;
  lighting: LightingMemory;
  camera: CameraMemory;
  emotion: EmotionMemory;
  animationEnergy: string;
  /** Canonical last-frame path after generation (runtime). */
  lastFramePath?: string;
  /** Official character bible asset paths for this cast. */
  bibleAssetPaths: string[];
  /** Reference stack: bible(s) + previous scene memory frame when available. */
  referenceImagePaths: string[];
  inheritsFromSceneId: string | null;
  /** Story-allowed resets (never silent identity/wardrobe drift). */
  intentionalChanges: string[];
  ok: boolean;
  rejects: Array<{ code: MemoryRejectCode; reason: string }>;
}

export interface ContinuityScores {
  /** Target > 95. */
  characterIdentity: number;
  /** Target > 95. */
  sceneContinuity: number;
  emotionContinuity: number;
  cameraContinuity: number;
}

export interface CharacterMemoryPackage {
  id: string;
  version: typeof CHARACTER_MEMORY_ENGINE_VERSION;
  createdAt: string;
  title: string;
  objective: string;
  scenes: SceneCharacterMemory[];
  scores: ContinuityScores;
  quality: {
    ok: boolean;
    summary: string;
    rejects: Array<{
      sceneId: string;
      code: MemoryRejectCode;
      reason: string;
    }>;
  };
}
