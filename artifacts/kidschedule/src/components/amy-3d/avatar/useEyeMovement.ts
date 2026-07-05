// useEyeMovement — natural gaze.
//
// Combines three behaviours that together read as "a living thing looking
// around", never robotic:
//   1. Idle saccades   — every few seconds the eyes flick to a new small target
//   2. Micro-tremor    — tiny continuous jitter so the gaze is never perfectly still
//   3. Cursor tracking — on desktop (fine pointer) the gaze biases toward the pointer
//
// On touch / coarse-pointer devices cursor tracking is off and amplitudes are
// reduced. When `attentive` (speaking) the gaze focuses forward.
//
// Writes pose.gaze every frame. If the rig exposes dedicated eye objects the
// composer applies eyeYaw/eyePitch to them; otherwise the gaze folds into a
// subtle whole-head turn, which still reads as Amy looking at you.

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AmyPose } from "./pose";

export interface EyeMovementOptions {
  reduced?: boolean;
  /** Max gaze yaw/pitch amplitude (rad). */
  amplitude?: number;
  /** Forward-focus while speaking. */
  attentive?: boolean;
  /** Scale gaze when skeletal GLB clips drive the head (0..1). */
  skeletalDamp?: number;
}

const DEG = Math.PI / 180;

function isFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(hover: none)").matches
  );
}

export function useEyeMovement(
  pose: AmyPose,
  options: EyeMovementOptions = {},
): void {
  const {
    reduced = false,
    amplitude = 9 * DEG,
    attentive = false,
    skeletalDamp = 1,
  } = options;
  const fine = useMemo(() => isFinePointer(), []);
  const { pointer } = useThree();

  const state = useRef({
    targetYaw: 0,
    targetPitch: 0,
    curYaw: 0,
    curPitch: 0,
    nextSaccade: 0.8 + Math.random() * 1.5,
  });

  useFrame((ctx) => {
    const g = pose.gaze;
    if (reduced) {
      g.headYaw = g.headPitch = g.eyeYaw = g.eyePitch = 0;
      return;
    }

    const t = ctx.clock.elapsedTime;
    const s = state.current;
    const amp = attentive ? amplitude * 0.3 : amplitude;

    // 1. Pick a fresh idle target on each saccade tick.
    if (attentive) {
      // Focus forward when speaking — small, frequent re-centering.
      s.targetYaw = 0;
      s.targetPitch = 0;
    } else if (t >= s.nextSaccade) {
      s.targetYaw = (Math.random() * 2 - 1) * amp;
      s.targetPitch = (Math.random() * 2 - 1) * amp * 0.6;
      s.nextSaccade = t + 1.4 + Math.random() * 2.6; // every ~1.4–4s
    }

    // 3. Bias toward the cursor on desktop.
    let aimYaw = s.targetYaw;
    let aimPitch = s.targetPitch;
    if (fine) {
      const px = THREE.MathUtils.clamp(pointer.x, -1, 1);
      const py = THREE.MathUtils.clamp(pointer.y, -1, 1);
      aimYaw = THREE.MathUtils.lerp(s.targetYaw, px * amplitude * 1.2, 0.6);
      aimPitch = THREE.MathUtils.lerp(s.targetPitch, py * amplitude * 0.9, 0.6);
    }

    // Saccades are fast (eyes snap), so use a fairly high approach rate.
    const rate = attentive ? 0.18 : 0.12;
    s.curYaw += (aimYaw - s.curYaw) * rate;
    s.curPitch += (aimPitch - s.curPitch) * rate;

    // 2. Micro-tremor so the gaze is never frozen.
    const tremor = reduced ? 0 : 0.4 * DEG;
    const jx = Math.sin(t * 7.3) * tremor;
    const jy = Math.cos(t * 6.1) * tremor;

    g.eyeYaw = s.curYaw + jx;
    g.eyePitch = s.curPitch + jy;
    g.headYaw = (s.curYaw + jx) * 0.5 * skeletalDamp;
    g.headPitch = (s.curPitch + jy) * 0.4 * skeletalDamp;
  });
}
