import type { AmyCharacterState } from "./amy-character-state";
import {
  AMY_BLINK_INTERVAL_MAX_MS,
  AMY_BLINK_INTERVAL_MIN_MS,
} from "./amy-character-constants";

export interface AmyBlinkSchedule {
  minMs: number;
  maxMs: number;
  doubleChance: number;
}

/** Per-state blink timing — natural 3–7 s baseline with state overrides. */
export function blinkSchedule(state: AmyCharacterState): AmyBlinkSchedule {
  switch (state) {
    case "listening":
      return { minMs: 5500, maxMs: 9500, doubleChance: 0.06 };
    case "thinking":
    case "waiting":
    case "sleeping":
      return { minMs: 4500, maxMs: 8200, doubleChance: 0.1 };
    case "talking":
      return { minMs: AMY_BLINK_INTERVAL_MIN_MS, maxMs: AMY_BLINK_INTERVAL_MAX_MS, doubleChance: 0.14 };
    case "celebrating":
    case "happy":
      return { minMs: 2800, maxMs: 5200, doubleChance: 0.26 };
    case "error":
      return { minMs: 3500, maxMs: 6500, doubleChance: 0.12 };
    default:
      return {
        minMs: AMY_BLINK_INTERVAL_MIN_MS,
        maxMs: AMY_BLINK_INTERVAL_MAX_MS,
        doubleChance: 0.22,
      };
  }
}

/** Suppress blink during wide-open mouth (long phoneme). */
export function shouldSuppressBlinkForMouth(mouthFrame: number, talking: boolean): boolean {
  return talking && mouthFrame === 2;
}
