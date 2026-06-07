// Shared, mutable pose buffer for the Amy avatar.
//
// Each animation hook (idle, eye-movement) writes into its OWN namespaced slice
// every frame; <AmyAvatar> runs one final useFrame that composes the slices and
// applies them to the actual Object3Ds. This keeps every hook a single-writer
// of its own channel, so they never clobber one another's rotation/position.

export interface IdleSlice {
  /** Vertical float offset (world units). */
  posY: number;
  /** Body sway pitch (rad). */
  rotX: number;
  /** Body sway yaw (rad). */
  rotY: number;
  /** Body sway roll / head tilt (rad). */
  rotZ: number;
  /** Breathing scale multiplier (~1.0). */
  scale: number;
}

export interface GazeSlice {
  /** Head yaw toward gaze target (rad). */
  headYaw: number;
  /** Head pitch toward gaze target (rad). */
  headPitch: number;
  /** Eye-only yaw, used when dedicated eye objects exist (rad). */
  eyeYaw: number;
  /** Eye-only pitch (rad). */
  eyePitch: number;
}

export interface AmyPose {
  idle: IdleSlice;
  gaze: GazeSlice;
}

export function createPose(): AmyPose {
  return {
    idle: { posY: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1 },
    gaze: { headYaw: 0, headPitch: 0, eyeYaw: 0, eyePitch: 0 },
  };
}
