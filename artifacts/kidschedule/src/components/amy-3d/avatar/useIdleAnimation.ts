// useIdleAnimation — the "alive at rest" layer.
//
// Subtle vertical float, breathing scale, gentle rotational sway and natural,
// slowly-drifting micro head-tilts. Pure procedural sin/perlin-ish noise, no
// state, no rerenders. Writes into pose.idle every frame; <AmyAvatar> applies.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { AmyPose } from "./pose";

export interface IdleAnimationOptions {
  /** Disable all motion (prefers-reduced-motion). */
  reduced?: boolean;
  /** Idle breathing amplitude (design spec: 0.01). */
  breathingAmplitude?: number;
  /** Max head-tilt amplitude in radians (design spec: 3deg). */
  tiltAmplitude?: number;
  /** Vertical float amplitude in world units. */
  floatAmplitude?: number;
  /**
   * When true the avatar adopts a slightly more attentive posture (less idle
   * drift, a touch taller). Driven by the speaking state.
   */
  attentive?: boolean;
}

const DEG = Math.PI / 180;

/**
 * Two desynchronised sine waves per axis approximate organic, non-repeating
 * drift far more cheaply than real noise — and never look metronomic.
 */
export function useIdleAnimation(
  pose: AmyPose,
  options: IdleAnimationOptions = {},
): void {
  const {
    reduced = false,
    breathingAmplitude = 0.01,
    tiltAmplitude = 3 * DEG,
    floatAmplitude = 0.015,
    attentive = false,
  } = options;

  // Random phase offsets so two mounted Amys never breathe in lockstep.
  const seed = useRef(Math.random() * 100);

  useFrame((ctx) => {
    const idle = pose.idle;
    if (reduced) {
      idle.posY = 0;
      idle.rotX = idle.rotY = idle.rotZ = 0;
      idle.scale = 1;
      return;
    }

    const t = ctx.clock.elapsedTime + seed.current;
    // Attentive posture dampens idle drift and lifts the chest a touch.
    const damp = attentive ? 0.45 : 1;
    const lift = attentive ? 1.0 : 0.0;

    // Breathing: gentle vertical scale, slightly faster when attentive.
    const breathHz = attentive ? 1.9 : 1.5;
    idle.scale = 1 + Math.sin(t * breathHz) * breathingAmplitude;

    // Float: layered slow + slower bob.
    idle.posY =
      (Math.sin(t * 1.3) * 0.7 + Math.sin(t * 0.55) * 0.3) * floatAmplitude * damp +
      lift * floatAmplitude * 0.6;

    // Rotational sway / micro head-tilt — three axes, all desynced & subtle.
    idle.rotZ = (Math.sin(t * 0.6) * 0.7 + Math.sin(t * 0.27) * 0.3) * tiltAmplitude * damp;
    idle.rotX = Math.sin(t * 0.47) * tiltAmplitude * 0.45 * damp;
    idle.rotY = Math.sin(t * 0.33) * tiltAmplitude * 0.5 * damp;
  });
}
