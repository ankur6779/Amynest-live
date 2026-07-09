// Emotional expression presets for Amy's face life.
//
// Pure presentation targets — never cartoonish. Smile intensities are the
// production polish targets (happy 25%, listening 15%, thinking 10%, talking
// dynamic). Amplitudes stay tiny so Tripo body clips remain primary motion.

import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

const DEG = Math.PI / 180;

export interface AmyExpressionPreset {
  /** Resting smile weight (0..1). Always > 0 so Amy never looks blank. */
  smile: number;
  /** How much the resting smile may slowly drift (±). */
  smileDrift: number;
  /** Eye highlight intensity multiplier. */
  eyeBright: number;
  /** Forward lean in radians (listening / speaking attentiveness). */
  lean: number;
  /** Extra head roll (curious tilt). */
  headTilt: number;
  /** Gaze pitch bias — positive looks upward (thinking). */
  gazePitchBias: number;
  /** Gaze yaw bias toward user (slight). */
  gazeYawBias: number;
  /** Blink interval range in seconds. */
  blinkMin: number;
  blinkMax: number;
  /** Chance of a double-blink (0..1). */
  doubleBlinkChance: number;
  /** Blink duration range in seconds. */
  blinkDurMin: number;
  blinkDurMax: number;
  /** Breathing / idle damp (1 = full idle drift). */
  idleDamp: number;
  /** Breathing rate multiplier. */
  breathRate: number;
  /** Occasional micro-nod while listening (6–10s). */
  microNod: boolean;
  /** Thinking glance-up cycle (look up → blink → return). */
  thinkingGlance: boolean;
  /** Talking: eyes brighten + tiny squash with speech energy. */
  speechEyeReact: boolean;
}

const BASE_BLINK = {
  blinkDurMin: 0.12,
  blinkDurMax: 0.18,
} as const;

export const AMY_EXPRESSION_PRESETS: Record<Amy3DState, AmyExpressionPreset> = {
  // Soft idle companion smile (~18%) with slow organic drift.
  idle: {
    smile: 0.18,
    smileDrift: 0.04,
    eyeBright: 1,
    lean: 0,
    headTilt: 0,
    gazePitchBias: 0,
    gazeYawBias: 0,
    blinkMin: 3,
    blinkMax: 6,
    doubleBlinkChance: 0.22,
    ...BASE_BLINK,
    idleDamp: 1,
    breathRate: 1,
    microNod: false,
    thinkingGlance: false,
    speechEyeReact: false,
  },
  // Listening: 15% smile, encouraging nods every 6–10s.
  listening: {
    smile: 0.15,
    smileDrift: 0.03,
    eyeBright: 1.06,
    lean: 0.7 * DEG,
    headTilt: 0.35 * DEG,
    gazePitchBias: 0,
    gazeYawBias: 0,
    blinkMin: 3.2,
    blinkMax: 5.5,
    doubleBlinkChance: 0.18,
    ...BASE_BLINK,
    idleDamp: 0.55,
    breathRate: 0.95,
    microNod: true,
    thinkingGlance: false,
    speechEyeReact: false,
  },
  // Thinking: 10% smile, glance-up cycle.
  thinking: {
    smile: 0.1,
    smileDrift: 0.025,
    eyeBright: 0.96,
    lean: 0,
    headTilt: 0.9 * DEG,
    gazePitchBias: 6 * DEG,
    gazeYawBias: 2 * DEG,
    blinkMin: 4.5,
    blinkMax: 7.5,
    doubleBlinkChance: 0.12,
    blinkDurMin: 0.14,
    blinkDurMax: 0.2,
    idleDamp: 0.7,
    breathRate: 0.75,
    microNod: false,
    thinkingGlance: true,
    speechEyeReact: false,
  },
  // Talking: dynamic smile driven by speech energy (base ~16%).
  speaking: {
    smile: 0.16,
    smileDrift: 0.05,
    eyeBright: 1.08,
    lean: 0.55 * DEG,
    headTilt: 0,
    gazePitchBias: 0,
    gazeYawBias: 0,
    blinkMin: 4,
    blinkMax: 7,
    doubleBlinkChance: 0.14,
    ...BASE_BLINK,
    idleDamp: 0.4,
    breathRate: 1.15,
    microNod: false,
    thinkingGlance: false,
    speechEyeReact: true,
  },
  // Happy / celebrating: 25% smile.
  celebrating: {
    smile: 0.25,
    smileDrift: 0.05,
    eyeBright: 1.14,
    lean: 0,
    headTilt: 0,
    gazePitchBias: 0,
    gazeYawBias: 0,
    blinkMin: 2.8,
    blinkMax: 5,
    doubleBlinkChance: 0.28,
    ...BASE_BLINK,
    idleDamp: 1.15,
    breathRate: 1.35,
    microNod: false,
    thinkingGlance: false,
    speechEyeReact: false,
  },
  // Encouraging ≈ soft happy.
  encouraging: {
    smile: 0.22,
    smileDrift: 0.04,
    eyeBright: 1.1,
    lean: 0.3 * DEG,
    headTilt: 0.4 * DEG,
    gazePitchBias: 0,
    gazeYawBias: 0,
    blinkMin: 3,
    blinkMax: 5.5,
    doubleBlinkChance: 0.2,
    ...BASE_BLINK,
    idleDamp: 0.85,
    breathRate: 1.1,
    microNod: false,
    thinkingGlance: false,
    speechEyeReact: false,
  },
};

/** Concerned look for error-adjacent UI. */
export const AMY_ERROR_EXPRESSION: AmyExpressionPreset = {
  smile: 0.08,
  smileDrift: 0.02,
  eyeBright: 0.88,
  lean: 0,
  headTilt: 0.5 * DEG,
  gazePitchBias: -1.5 * DEG,
  gazeYawBias: 0,
  blinkMin: 3.5,
  blinkMax: 6.5,
  doubleBlinkChance: 0.12,
  ...BASE_BLINK,
  idleDamp: 0.5,
  breathRate: 0.9,
  microNod: false,
  thinkingGlance: false,
  speechEyeReact: false,
};

export function expressionForState(state: Amy3DState): AmyExpressionPreset {
  return AMY_EXPRESSION_PRESETS[state] ?? AMY_EXPRESSION_PRESETS.idle;
}
