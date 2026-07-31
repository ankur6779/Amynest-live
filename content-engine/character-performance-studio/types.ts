/**
 * Character Performance Studio — additive acting craft on top of
 * AI Director + Performance Director. Prompt engineering only.
 */

import type { BrandCharacterId } from "../brand/types.js";

export const CHARACTER_PERFORMANCE_STUDIO_VERSION = "1.0.0";

export type CharacterInternalGoal =
  | "help-teach-encourage-protect"
  | "understand-try-learn-celebrate"
  | "explore-discover-experiment-fun";

export type FaceEmotionCue =
  | "tiny-smile"
  | "eyebrow-lift"
  | "soft-surprise"
  | "thinking-face"
  | "confusion"
  | "confidence"
  | "pride"
  | "relief"
  | "hope";

export type EyeFocusTarget =
  | "speaker"
  | "amy-ai"
  | "amy-girl"
  | "amy-boy"
  | "object"
  | "partner"
  | "shared-glance";

export type BodyPosture =
  | "lean-forward"
  | "kneel"
  | "sit-naturally"
  | "cross-step"
  | "weight-shift"
  | "shoulder-soft"
  | "gentle-hand-gesture";

export type ChildEnergyVerb =
  | "skip"
  | "lean"
  | "peek"
  | "wave"
  | "hug"
  | "bounce"
  | "giggle"
  | "run"
  | "point"
  | "celebrate"
  | "jump-lightly"
  | "look-around"
  | "react-naturally";

export type MentorVerb =
  | "walk-beside"
  | "kneel"
  | "sit-with"
  | "point-softly"
  | "celebrate-together"
  | "high-five"
  | "comfort"
  | "encourage";

export type StudioFraming =
  | "wide"
  | "medium"
  | "close"
  | "reaction"
  | "over-the-shoulder"
  | "tracking";

export type StudioRejectCode =
  | "posed"
  | "no-interaction"
  | "eyes-unfocused"
  | "neutral-face"
  | "robotic-body"
  | "narrator-amy"
  | "ad-mode"
  | "static-shot"
  | "repeated-framing"
  | "ok";

export interface CharacterActingBrief {
  character: BrandCharacterId;
  internalGoal: CharacterInternalGoal;
  intention: string;
  face: FaceEmotionCue[];
  eyeFocus: EyeFocusTarget;
  body: BodyPosture[];
  energyVerbs: Array<ChildEnergyVerb | MentorVerb>;
  antiPattern: string;
}

export interface StudioScenePlan {
  sceneId: string;
  index: number;
  briefs: CharacterActingBrief[];
  framing: StudioFraming;
  previousFraming: StudioFraming | null;
  shotDensityNote: string;
  noAdModeNote: string;
  visualRhythmNote: string;
  dominantFaceStory: string;
  ok: boolean;
  rejects: Array<{ code: StudioRejectCode; reason: string }>;
}

export interface CharacterPerformanceStudioPackage {
  id: string;
  version: typeof CHARACTER_PERFORMANCE_STUDIO_VERSION;
  createdAt: string;
  title: string;
  objective: string;
  scenes: StudioScenePlan[];
  quality: {
    ok: boolean;
    score: number;
    rejects: Array<{ sceneId: string; code: StudioRejectCode; reason: string }>;
    summary: string;
  };
}
