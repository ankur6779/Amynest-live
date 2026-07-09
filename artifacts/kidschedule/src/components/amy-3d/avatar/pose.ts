// Shared, mutable pose buffer for the Amy avatar.
//
// Each animation hook writes into its OWN namespaced slice every frame;
// <AmyAvatar> runs one final useFrame that composes the slices. Hooks never
// clobber one another's rotation/position.

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
  /** Gesture amplitude scale from speech energy (1 = baseline). */
  gestureAmp: number;
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

/** Speech-energy emphasis for head/hand gesture sync (0..1). */
export interface EnergySlice {
  level: number;
}

/**
 * Face-life channels written by blink / smile / listening / thinking hooks.
 * Composed onto FaceDriver in AmyAvatar's final frame.
 */
export interface FaceLifeSlice {
  /** Current blink lid amount 0..1 (from useBlink). */
  blink: number;
  /** Base smile target before blink/listening boosts. */
  smileBase: number;
  /** Extra smile from blink cheek lift / listening pulse. */
  smileBoost: number;
  /** Cheek lift 0..1 (blink-coupled). */
  cheekLift: number;
  /** Eye openness scale (~1; >1 = widen, <1 = squash). */
  eyeOpen: number;
  /** Eye highlight multiplier. */
  eyeBright: number;
}

/**
 * Speech anticipation / finish / celebration settle envelopes.
 * Written by useEmotionalPresence; applied in AmyAvatar compose.
 */
export interface PresenceSlice {
  /** Inhale (+) / exhale (−) scale offset. */
  inhale: number;
  /** Subtle head lift during anticipation (rad). */
  headLift: number;
  /** 0..1 anticipation envelope. */
  anticipate: number;
  /** 0..1 finish / settle envelope. */
  finish: number;
  /** Active presence phase label (debug / compose). */
  phase: string;
}

export interface AmyPose {
  idle: IdleSlice;
  gaze: GazeSlice;
  energy: EnergySlice;
  face: FaceLifeSlice;
  presence: PresenceSlice;
}

export function createPose(): AmyPose {
  return {
    idle: { posY: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1, gestureAmp: 1 },
    gaze: { headYaw: 0, headPitch: 0, eyeYaw: 0, eyePitch: 0 },
    energy: { level: 0 },
    face: {
      blink: 0,
      smileBase: 0.18,
      smileBoost: 0,
      cheekLift: 0,
      eyeOpen: 1,
      eyeBright: 1,
    },
    presence: {
      inhale: 0,
      headLift: 0,
      anticipate: 0,
      finish: 0,
      phase: "none",
    },
  };
}
