import type { ObjectKind } from "@workspace/math-playground";

export type PlaygroundAmyMood =
  | "idle"
  | "speaking"
  | "listening"
  | "celebrating"
  | "encouraging";

export type AmyReactionKind =
  | "clap"
  | "jump"
  | "spin"
  | "dance"
  | "throw_stars"
  | "celebrate"
  | "point"
  | "wave"
  | "demonstrate"
  | "encourage"
  | "blink"
  | "sway"
  | "smile"
  | "look_around";

export interface AmyReactionDef {
  kind: AmyReactionKind;
  mood: PlaygroundAmyMood;
  durationMs: number;
  particle?: "stars" | "sparkle" | "confetti";
  cueKey?: string;
  weight: number;
}

export interface EmotionalEngagementInput {
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  sessionLengthMs: number;
  idleMs: number;
  justSucceeded?: boolean;
  justFailed?: boolean;
  amySpeaking?: boolean;
  childListening?: boolean;
}

export interface AmyPresenceOutput {
  mood: PlaygroundAmyMood;
  reaction: AmyReactionDef | null;
  idleLoop: boolean;
}

export type ObjectAnimationTrigger =
  | "tap"
  | "collect"
  | "correct"
  | "wrong"
  | "idle_wiggle";

export interface ObjectAnimationPreset {
  kind: ObjectKind;
  triggers: Partial<Record<ObjectAnimationTrigger, string[]>>;
}

export interface EngagementStateUpdate {
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastInteractionAt: number;
}
