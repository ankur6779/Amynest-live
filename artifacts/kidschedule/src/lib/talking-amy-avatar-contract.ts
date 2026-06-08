/**
 * Stable avatar contract for Talking Amy — current AmyAvatar today, amy.riv tomorrow.
 * Business logic maps phases → inputs; renderers consume inputs only.
 */

import type { RefObject } from "react";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export type TalkingAmyAvatarMood = Amy3DState;

export type TalkingAmyAvatarInputs = {
  /** Mouth openness 0..1 (lip-sync / viseme drive). */
  viseme: number;
  /** Trigger blink cue — renderer may animate on rising edge. */
  blink: boolean;
  mood: TalkingAmyAvatarMood;
  /** Clamped live mic level 0..1. */
  micLevel: number;
};

export type TalkingAmyPhase = "idle" | "recording" | "thinking" | "echoing" | "celebrate";

export function clampViseme(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampMicLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.max(0, level));
}

export function phaseToTalkingAmyMood(phase: TalkingAmyPhase): TalkingAmyAvatarMood {
  switch (phase) {
    case "recording":
      return "listening";
    case "thinking":
      return "thinking";
    case "echoing":
      return "speaking";
    case "celebrate":
      return "celebrating";
    default:
      return "idle";
  }
}

/**
 * Derive renderer inputs from Talking Amy phase + live mic level.
 */
export function buildTalkingAmyAvatarInputs(
  phase: TalkingAmyPhase,
  rawMicLevel: number,
): TalkingAmyAvatarInputs {
  const micLevel = clampMicLevel(rawMicLevel);
  const mood = phaseToTalkingAmyMood(phase);

  let viseme = 0;
  if (phase === "recording") {
    viseme = clampViseme(micLevel * 1.15);
  } else if (phase === "echoing" || phase === "celebrate") {
    viseme = 0.85;
  } else if (phase === "thinking") {
    viseme = 0.25;
  }

  return {
    viseme,
    blink: phase === "thinking",
    mood,
    micLevel,
  };
}

/** Map contract mood to existing AmyAvatar state prop (identity today). */
export function avatarInputsToAmyState(inputs: TalkingAmyAvatarInputs): Amy3DState {
  return inputs.mood;
}

/**
 * Future Rive renderer props — swap without touching Talking Amy orchestration.
 */
export type TalkingAmyAvatarRendererProps = {
  inputs: TalkingAmyAvatarInputs;
  size: number;
  reducedMotion: boolean;
  audioLevelRef?: RefObject<number>;
};
