/**
 * Story Memory Engine 1.0 — final additive creative layer.
 * Narrative / emotional thread continuity. Not a new Director or prompt system.
 */

import type { BrandCharacterId } from "../brand/types.js";

export const STORY_MEMORY_ENGINE_VERSION = "1.0.0";

export type StoryRejectCode =
  | "scene-disconnected"
  | "emotion-reset"
  | "story-jump"
  | "problem-unsolved"
  | "cta-interrupts"
  | "goal-reset"
  | "callback-missing"
  | "ok";

export type StoryBeatStage =
  | "problem"
  | "notice"
  | "help"
  | "success"
  | "celebration"
  | "invite";

export interface CharacterGoalMemory {
  character: BrandCharacterId;
  goal: string;
  status: "active" | "completed" | "carried";
}

export interface VisualCallbackMemory {
  id: string;
  element: string;
  firstSeenSceneId: string;
  state: string;
  /** Scenes where this element should reappear. */
  recallSceneRoles: string[];
}

export interface SceneStoryMemory {
  sceneId: string;
  index: number;
  role: string;
  /** What just happened (from previous beat). */
  whatJustHappened: string;
  /** Causal why for this beat. */
  whyItHappened: string;
  /** Emotional promise still outstanding. */
  emotionalPromise: string;
  /** What must happen next. */
  whatMustHappenNext: string;
  beatStage: StoryBeatStage;
  emotionThread: string;
  previousEmotionThread: string | null;
  goals: CharacterGoalMemory[];
  visualCallbacks: VisualCallbackMemory[];
  /** Active callback reminder for THIS scene. */
  callbackNote: string;
  endingNote: string;
  inheritsFromSceneId: string | null;
  ok: boolean;
  rejects: Array<{ code: StoryRejectCode; reason: string }>;
}

export interface StoryScores {
  narrativeContinuity: number;
  emotionalContinuity: number;
  storyCohesion: number;
  endingSatisfaction: number;
}

export interface StoryMemoryPackage {
  id: string;
  version: typeof STORY_MEMORY_ENGINE_VERSION;
  createdAt: string;
  title: string;
  objective: string;
  emotionalThroughline: string;
  scenes: SceneStoryMemory[];
  scores: StoryScores;
  quality: {
    ok: boolean;
    summary: string;
    rejects: Array<{
      sceneId: string;
      code: StoryRejectCode;
      reason: string;
    }>;
  };
}
