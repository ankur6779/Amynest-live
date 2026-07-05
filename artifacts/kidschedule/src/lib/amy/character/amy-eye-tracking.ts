import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import { AMY_PUPIL_MAX_PX } from "./amy-character-constants";

export interface AmyPupilOffset {
  x: number;
  y: number;
}

const IDLE_SWAY_AMP = 1.8;
const IDLE_SWAY_PERIOD = 5.5;

/** Pointer target stored by the engine (desktop). */
export type AmyEyePointerTarget = { x: number; y: number };

/**
 * Compute pupil offset for one animation frame.
 * Desktop: ease toward pointer target; mobile: idle sway around centre.
 */
export function computeAmyPupilOffset(
  elapsedSec: number,
  container: HTMLElement | null,
  pointerTarget: AmyEyePointerTarget,
  current: AmyPupilOffset,
  isCoarsePointer: boolean,
): AmyPupilOffset {
  let tx = pointerTarget.x;
  let ty = pointerTarget.y;

  if (isCoarsePointer) {
    tx = Math.sin(elapsedSec / IDLE_SWAY_PERIOD) * IDLE_SWAY_AMP;
    ty = Math.cos(elapsedSec / (IDLE_SWAY_PERIOD * 1.15)) * (IDLE_SWAY_AMP * 0.65);
  }

  return {
    x: current.x + (tx - current.x) * 0.14,
    y: current.y + (ty - current.y) * 0.14,
  };
}

/** Map pointer event to clamped pupil target (desktop). */
export function pointerToPupilTarget(
  clientX: number,
  clientY: number,
  container: HTMLElement,
): AmyEyePointerTarget {
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.36;
  const dx = (clientX - cx) / (rect.width / 2);
  const dy = (clientY - cy) / (rect.height / 2);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    x: clamp(dx) * AMY_PUPIL_MAX_PX,
    y: clamp(dy) * AMY_PUPIL_MAX_PX,
  };
}
