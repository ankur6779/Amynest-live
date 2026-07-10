// HybridFaceDriver — prefers GLB morph targets, fills gaps with procedural overlays.
//
// Today amy.glb has no morphs → fully procedural (head-attached).
// Tomorrow a rigged GLB arrives → morph blink/smile/visemes take over; procedural
// only supplies channels the morph manager lacks (e.g. eye highlight).

import type * as THREE from "three";
import type { FaceDriver, FaceGaze } from "./face-driver";
import type { MorphTargetManager, Viseme } from "./visemes";
import type { ProceduralFaceDriver } from "./procedural-face";

export class HybridFaceDriver implements FaceDriver {
  readonly kind = "hybrid" as const;

  constructor(
    private readonly morph: MorphTargetManager,
    private readonly procedural: ProceduralFaceDriver | null,
  ) {}

  get hasBlink(): boolean {
    return this.morph.hasBlink || !!this.procedural?.hasBlink;
  }

  get hasMouth(): boolean {
    return this.morph.hasMouth || !!this.procedural?.hasMouth;
  }

  get hasSmile(): boolean {
    return this.morph.hasSmile || !!this.procedural?.hasSmile;
  }

  /** True when morph visemes exist (event-driven lip-sync path). */
  get hasVisemes(): boolean {
    return this.morph.hasVisemes;
  }

  get morphManager(): MorphTargetManager {
    return this.morph;
  }

  /** Procedural backend when morphs are missing (null if unused). */
  get proceduralDriver(): ProceduralFaceDriver | null {
    return this.procedural;
  }

  setBlink(value: number): void {
    if (this.morph.hasBlink) {
      this.morph.setBlink(value);
      // Keep procedural lids open so we don't double-draw.
      this.procedural?.setBlink(0);
    } else {
      this.procedural?.setBlink(value);
    }
  }

  setSmile(value: number): void {
    if (this.morph.hasSmile) {
      this.morph.setSmile(value);
    } else {
      this.procedural?.setSmile(value);
    }
  }

  lerpSmile(target: number, alpha: number): void {
    if (this.morph.hasSmile) {
      this.morph.lerpSmile(target, alpha);
    } else {
      this.procedural?.lerpSmile(target, alpha);
    }
  }

  setMouthOpen(value: number): void {
    if (this.morph.hasVisemes) {
      this.morph.setMouthOpen(value);
      this.procedural?.setMouthOpen(0);
    } else {
      this.procedural?.setMouthOpen(value);
    }
  }

  setEyeHighlight(value: number): void {
    // Always drive procedural highlight when present — morphs don't cover specular.
    this.procedural?.setEyeHighlight(value);
    this.morph.setEyeHighlight(value);
  }

  setEyeOpen(value: number): void {
    this.procedural?.setEyeOpen?.(value);
  }

  setCheekLift(value: number): void {
    this.procedural?.setCheekLift?.(value);
  }

  setGaze(gaze: FaceGaze): void {
    this.procedural?.setGaze(gaze);
    this.morph.setGaze(gaze);
  }

  lerpVisemes(targets: Partial<Record<Viseme, number>>, alpha: number): void {
    this.morph.lerpVisemes(targets, alpha);
  }

  closeMouth(): void {
    this.morph.closeMouth();
    this.procedural?.setMouthOpen(0);
  }

  dispose(): void {
    this.morph.dispose();
    this.procedural?.dispose();
  }
}

/**
 * Build the best FaceDriver for a loaded scene.
 * Procedural overlays attach only when the Head bone exists AND at least one
 * facial channel is missing from morph targets.
 */
export function createFaceDriver(
  morph: MorphTargetManager,
  head: THREE.Object3D | null,
): HybridFaceDriver {
  // No procedural overlay meshes on amy.glb (lids/mouth looked wrong).
  // Keep an empty driver only so smile lerp / dispose stay wired; morphs win
  // when a future rigged GLB arrives.
  void head;
  return new HybridFaceDriver(morph, null);
}
