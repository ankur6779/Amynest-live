// FaceDriver — clean facial animation interface.
//
// Today the Tripo amy.glb has ZERO morph targets and no eye/jaw bones.
// Tomorrow a rigged GLB with ARKit/RPM blend shapes drops in and MorphTargetManager
// lights up automatically. Callers always talk to FaceDriver; they never care
// which backend is live.
//
// Contract:
//   setBlink / setSmile / setMouthOpen / setEyeHighlight / setGaze / dispose
// No API changes required when swapping morph ↔ procedural backends.

export interface FaceGaze {
  /** Eye yaw in radians (tiny — max ~2–3°). */
  eyeYaw: number;
  /** Eye pitch in radians. */
  eyePitch: number;
}

/**
 * Unified face control surface. Implementations must be safe to call every
 * frame and must no-op cleanly when a channel is unsupported.
 */
export interface FaceDriver {
  readonly kind: "morph" | "procedural" | "hybrid";
  /** True when blink can visibly close the lids. */
  readonly hasBlink: boolean;
  /** True when mouth open can visibly move. */
  readonly hasMouth: boolean;
  /** True when smile can visibly change. */
  readonly hasSmile: boolean;

  /** 0 = open, 1 = fully closed. */
  setBlink(value: number): void;
  /** 0 = neutral, 1 = full smile. */
  setSmile(value: number): void;
  /** Smooth smile approach. */
  lerpSmile(target: number, alpha: number): void;
  /**
   * Mouth openness 0..1 (jaw / lip flap). Used by procedural lip-sync when
   * morph visemes are absent. Morph backends may map this onto jawOpen.
   */
  setMouthOpen(value: number): void;
  /** Eye specular highlight intensity multiplier (~0.7–1.2). */
  setEyeHighlight(value: number): void;
  /**
   * Eye openness scale (1 = rest, >1 widen, <1 squash). Very subtle —
   * speech / listening / blink reactions.
   */
  setEyeOpen?(value: number): void;
  /** Cheek lift 0..1 — coupled to blink for Pixar-soft face squash. */
  setCheekLift?(value: number): void;
  /** Tiny pupil / eye-plane drift. */
  setGaze(gaze: FaceGaze): void;
  /** Zero every channel — call on unmount. */
  dispose(): void;
}

/** Optional speech-energy hint for gesture emphasis (presentation only). */
export interface SpeechEnergySample {
  /** 0..1 smoothed energy. */
  level: number;
}
