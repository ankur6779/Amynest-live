import type { AmyCharacterState } from "./amy-character-state";

/** Per-state motion targets — all amplitudes kept below 2% where noted. */
export interface AmyMotionPreset {
  rotateZ: number;
  rotateY: number;
  floatAmp: number;
  floatPeriod: number;
  breathAmp: number;
  swayAmp: number;
  pupilBiasY: number;
  eyeBrightness: number;
  haloIntensity: number;
  listenRingBright: number;
}

const IDLE: AmyMotionPreset = {
  rotateZ: 0.8,
  rotateY: 2,
  floatAmp: 0.016,
  floatPeriod: 3.8,
  breathAmp: 0.012,
  swayAmp: 0.9,
  pupilBiasY: 0,
  eyeBrightness: 1,
  haloIntensity: 1,
  listenRingBright: 0,
};

export function motionPresetForState(state: AmyCharacterState): AmyMotionPreset {
  switch (state) {
    case "listening":
      return {
        rotateZ: 1.2,
        rotateY: 5,
        floatAmp: 0.014,
        floatPeriod: 4.2,
        breathAmp: 0.008,
        swayAmp: 0.6,
        pupilBiasY: 0,
        eyeBrightness: 1.08,
        haloIntensity: 1.18,
        listenRingBright: 1,
      };
    case "thinking":
      return {
        rotateZ: 1.5,
        rotateY: 3,
        floatAmp: 0.01,
        floatPeriod: 5.6,
        breathAmp: 0.009,
        swayAmp: 0.5,
        pupilBiasY: -2.5,
        eyeBrightness: 0.96,
        haloIntensity: 0.72,
        listenRingBright: 0,
      };
    case "talking":
      return {
        rotateZ: 0.6,
        rotateY: 0,
        floatAmp: 0.017,
        floatPeriod: 3.2,
        breathAmp: 0.011,
        swayAmp: 0.4,
        pupilBiasY: 0,
        eyeBrightness: 1,
        haloIntensity: 1.05,
        listenRingBright: 0,
      };
    case "celebrating":
    case "happy":
      return {
        rotateZ: 0,
        rotateY: 0,
        floatAmp: 0.024,
        floatPeriod: 1.15,
        breathAmp: 0.018,
        swayAmp: 1.1,
        pupilBiasY: 0,
        eyeBrightness: 1.12,
        haloIntensity: 1.28,
        listenRingBright: 0,
      };
    case "waiting":
      return {
        rotateZ: 0.5,
        rotateY: 1,
        floatAmp: 0.011,
        floatPeriod: 4.6,
        breathAmp: 0.01,
        swayAmp: 0.7,
        pupilBiasY: 0,
        eyeBrightness: 0.94,
        haloIntensity: 0.65,
        listenRingBright: 0,
      };
    case "sleeping":
      return {
        rotateZ: 0,
        rotateY: 0,
        floatAmp: 0.008,
        floatPeriod: 6.2,
        breathAmp: 0.007,
        swayAmp: 0.35,
        pupilBiasY: 0,
        eyeBrightness: 0.5,
        haloIntensity: 0.42,
        listenRingBright: 0,
      };
    case "error":
      return {
        rotateZ: 0,
        rotateY: 0,
        floatAmp: 0.012,
        floatPeriod: 4,
        breathAmp: 0.01,
        swayAmp: 0.3,
        pupilBiasY: 1.5,
        eyeBrightness: 0.88,
        haloIntensity: 0.55,
        listenRingBright: 0,
      };
    default:
      return IDLE;
  }
}

export function lerpMotion(a: AmyMotionPreset, b: AmyMotionPreset, t: number): AmyMotionPreset {
  const k = Math.max(0, Math.min(1, t));
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    rotateZ: mix(a.rotateZ, b.rotateZ),
    rotateY: mix(a.rotateY, b.rotateY),
    floatAmp: mix(a.floatAmp, b.floatAmp),
    floatPeriod: mix(a.floatPeriod, b.floatPeriod),
    breathAmp: mix(a.breathAmp, b.breathAmp),
    swayAmp: mix(a.swayAmp, b.swayAmp),
    pupilBiasY: mix(a.pupilBiasY, b.pupilBiasY),
    eyeBrightness: mix(a.eyeBrightness, b.eyeBrightness),
    haloIntensity: mix(a.haloIntensity, b.haloIntensity),
    listenRingBright: mix(a.listenRingBright, b.listenRingBright),
  };
}

export function lerpPresetToward(
  current: AmyMotionPreset,
  target: AmyMotionPreset,
  dtSec: number,
  transitionMs: number,
): AmyMotionPreset {
  const rate = 1 - Math.exp(-dtSec / (transitionMs / 1000));
  return lerpMotion(current, target, rate);
}
