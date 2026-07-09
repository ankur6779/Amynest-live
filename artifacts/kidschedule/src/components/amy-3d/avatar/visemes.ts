// Reusable viseme + morph-target system for the Amy mascot.
//
// This module is engine-agnostic and audio-free: it never touches the mic, an
// AudioContext, or any playback (see speech-coach-engine-freeze.mdc). It only
// translates *viseme events* (pushed in from above) into morph-target
// influences on whatever rig the loaded GLB happens to expose.
//
// It is intentionally defensive: a Tripo / image-to-3D export usually ships
// with NO blend shapes at all. In that case every resolver returns -1 and every
// setter is a no-op, so the rest of the avatar (idle motion, gaze, halo) keeps
// working and the whole thing simply lights up the moment a rigged model
// (ARKit / RPM / VRoid visemes) is dropped in.

import type * as THREE from "three";
import type { FaceDriver, FaceGaze } from "./face-driver";

/** The five canonical mouth shapes the lip-sync system understands. */
export type Viseme = "AA" | "EE" | "IH" | "OH" | "OU";

/** A neutral / closed-mouth marker used between phonemes and at rest. */
export type VisemeOrRest = Viseme | "REST";

/**
 * For each viseme, the morph-target names we try (in order) across the common
 * rig conventions: ARKit, Oculus/Meta, Ready Player Me, VRoid/VRM (`vrc.v_*`),
 * and a few generic fallbacks. The first name present on the mesh wins.
 */
const VISEME_MORPH_CANDIDATES: Record<Viseme, string[]> = {
  AA: ["viseme_aa", "AA", "vrc.v_aa", "jawOpen", "JawOpen", "mouthOpen", "A"],
  EE: ["viseme_E", "viseme_ee", "EE", "vrc.v_e", "mouthSmile", "E", "I"],
  IH: ["viseme_I", "viseme_ih", "IH", "vrc.v_ih", "mouthStretch", "mouthStretchLeft"],
  OH: ["viseme_O", "viseme_oh", "OH", "vrc.v_oh", "mouthFunnel", "O"],
  OU: ["viseme_U", "viseme_ou", "OU", "vrc.v_ou", "mouthPucker", "U"],
};

/** A single resolved morph channel: which mesh + which influence index. */
interface MorphChannel {
  mesh: THREE.Mesh;
  index: number;
}

export interface MorphResolveResult {
  /** True if at least one viseme channel resolved to a real morph target. */
  hasVisemes: boolean;
  /** True if at least one blink channel resolved. */
  hasBlink: boolean;
}

const SMILE_MORPH_CANDIDATES = [
  "mouthSmile",
  "mouthSmile_L",
  "mouthSmile_R",
  "mouthSmileLeft",
  "mouthSmileRight",
  "smile",
  "happy",
];

const BLINK_MORPH_CANDIDATES = [
  "eyeBlink_L",
  "eyeBlink_R",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyesClosed",
  "blink",
  "blinkLeft",
  "blinkRight",
  "blink_L",
  "blink_R",
  "vrc.blink_left",
  "vrc.blink_right",
];

/**
 * Resolves and drives morph targets on a loaded scene. One instance owns all
 * viseme + blink channels and exposes simple setters used by the hooks. All
 * influences it touched are zeroed on `dispose()` so re-mounts start clean.
 *
 * Implements {@link FaceDriver} so a future rigged GLB needs no API changes —
 * callers already talk to FaceDriver.
 */
export class MorphTargetManager implements FaceDriver {
  readonly kind = "morph" as const;
  private visemeChannels = new Map<Viseme, MorphChannel[]>();
  private blinkChannels: MorphChannel[] = [];
  private smileChannels: MorphChannel[] = [];
  /** Every (mesh,index) we have ever written, for cleanup. */
  private touched: MorphChannel[] = [];
  private current: Record<Viseme, number> = { AA: 0, EE: 0, IH: 0, OH: 0, OU: 0 };
  private blinkValue = 0;
  private smileValue = 0;

  resolve(scene: THREE.Object3D): MorphResolveResult {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.morphTargetDictionary && m.morphTargetInfluences) meshes.push(m);
    });

    (Object.keys(VISEME_MORPH_CANDIDATES) as Viseme[]).forEach((v) => {
      const channels: MorphChannel[] = [];
      for (const name of VISEME_MORPH_CANDIDATES[v]) {
        for (const mesh of meshes) {
          const dict = mesh.morphTargetDictionary!;
          if (name in dict) channels.push({ mesh, index: dict[name] });
        }
        if (channels.length) break; // first matching convention wins
      }
      if (channels.length) {
        this.visemeChannels.set(v, channels);
        this.touched.push(...channels);
      }
    });

    for (const name of BLINK_MORPH_CANDIDATES) {
      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary!;
        if (name in dict) this.blinkChannels.push({ mesh, index: dict[name] });
      }
    }
    this.touched.push(...this.blinkChannels);

    for (const name of SMILE_MORPH_CANDIDATES) {
      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary!;
        if (name in dict) this.smileChannels.push({ mesh, index: dict[name] });
      }
    }
    this.touched.push(...this.smileChannels);

    return {
      hasVisemes: this.visemeChannels.size > 0,
      hasBlink: this.blinkChannels.length > 0,
    };
  }

  get hasVisemes(): boolean {
    return this.visemeChannels.size > 0;
  }

  get hasBlink(): boolean {
    return this.blinkChannels.length > 0;
  }

  get hasMouth(): boolean {
    return this.visemeChannels.size > 0;
  }

  get hasSmile(): boolean {
    return this.smileChannels.length > 0;
  }

  /** Set the weight (0..1) for one viseme. */
  setViseme(v: Viseme, weight: number): void {
    const w = clamp01(weight);
    this.current[v] = w;
    const channels = this.visemeChannels.get(v);
    if (!channels) return;
    for (const c of channels) write(c, w);
  }

  /** Smoothly move every viseme toward a target set (lerp factor 0..1). */
  lerpVisemes(targets: Partial<Record<Viseme, number>>, alpha: number): void {
    (Object.keys(this.current) as Viseme[]).forEach((v) => {
      const target = clamp01(targets[v] ?? 0);
      const next = this.current[v] + (target - this.current[v]) * alpha;
      this.setViseme(v, next);
    });
  }

  /** Reset all mouth shapes to neutral immediately. */
  closeMouth(): void {
    (Object.keys(this.current) as Viseme[]).forEach((v) => this.setViseme(v, 0));
  }

  /** Drive both eyelids to `value` (0 = open, 1 = shut). */
  setBlink(value: number): void {
    this.blinkValue = clamp01(value);
    for (const c of this.blinkChannels) write(c, this.blinkValue);
  }

  /** Drive the smile expression (0 = neutral, 1 = full smile). */
  setSmile(value: number): void {
    this.smileValue = clamp01(value);
    for (const c of this.smileChannels) write(c, this.smileValue);
  }

  /** Smoothly approach a smile target. */
  lerpSmile(target: number, alpha: number): void {
    this.setSmile(this.smileValue + (clamp01(target) - this.smileValue) * alpha);
  }

  /**
   * Map a single openness value onto the AA (jaw-open) viseme when present.
   * Used by FaceDriver callers that don't speak full viseme timelines.
   */
  setMouthOpen(value: number): void {
    const w = clamp01(value);
    if (this.visemeChannels.has("AA")) {
      this.lerpVisemes({ AA: w }, 0.55);
    }
  }

  /** Morph backends have no specular overlay — no-op. */
  setEyeHighlight(_value: number): void {}

  setEyeOpen(_value: number): void {}

  setCheekLift(_value: number): void {}

  /** Morph backends rely on eye bones for gaze — no-op here. */
  setGaze(_gaze: FaceGaze): void {}

  /** Zero every influence we ever touched — call on unmount. */
  dispose(): void {
    for (const c of this.touched) write(c, 0);
    this.visemeChannels.clear();
    this.blinkChannels = [];
    this.smileChannels = [];
    this.touched = [];
  }
}

function write(c: MorphChannel, value: number): void {
  const infl = c.mesh.morphTargetInfluences;
  if (infl && c.index >= 0 && c.index < infl.length) infl[c.index] = value;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
