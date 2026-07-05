import type { AmyCharacterState } from "./amy-character-state";

export interface AmyHaloMotion {
  /** Base scale multiplier. */
  base: number;
  /** Pulse amplitude added to scale. */
  amp: number;
  /** Pulse period (seconds). */
  period: number;
  /** Base opacity 0..1. */
  opacityBase: number;
  /** Opacity pulse amplitude. */
  opacityAmp: number;
}

export interface AmyHaloColors {
  /** Inner radial gradient stop. */
  inner: string;
  /** Outer fade stop. */
  outer: string;
}

export function haloColors(state: AmyCharacterState): AmyHaloColors {
  switch (state) {
    case "listening":
      return { inner: "rgba(34,211,238,0.55)", outer: "rgba(56,189,248,0.12)" };
    case "thinking":
    case "waiting":
    case "sleeping":
      return { inner: "rgba(251,191,36,0.42)", outer: "rgba(251,191,36,0.08)" };
    case "talking":
      return { inner: "rgba(168,85,247,0.58)", outer: "rgba(236,72,153,0.14)" };
    case "celebrating":
    case "happy":
      return { inner: "rgba(251,191,36,0.62)", outer: "rgba(251,191,36,0.16)" };
    case "error":
      return { inner: "rgba(244,114,182,0.45)", outer: "rgba(244,114,182,0.1)" };
    default:
      return { inner: "rgba(139,92,246,0.48)", outer: "rgba(139,92,246,0.1)" };
  }
}

export function haloMotion(state: AmyCharacterState): AmyHaloMotion {
  switch (state) {
    case "listening":
      return { base: 1, amp: 0.018, period: 2.8, opacityBase: 0.58, opacityAmp: 0.38 };
    case "thinking":
    case "waiting":
    case "sleeping":
      return { base: 1, amp: 0.022, period: 4.2, opacityBase: 0.48, opacityAmp: 0.22 };
    case "talking":
      return { base: 1, amp: 0.048, period: 0.95, opacityBase: 0.55, opacityAmp: 0.42 };
    case "celebrating":
    case "happy":
      return { base: 1.04, amp: 0.06, period: 0.75, opacityBase: 0.62, opacityAmp: 0.35 };
    case "error":
      return { base: 1, amp: 0.015, period: 3.6, opacityBase: 0.45, opacityAmp: 0.18 };
    default:
      return { base: 1, amp: 0.024, period: 4.4, opacityBase: 0.5, opacityAmp: 0.28 };
  }
}
