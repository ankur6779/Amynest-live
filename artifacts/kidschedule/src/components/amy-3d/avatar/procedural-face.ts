// ProceduralFaceDriver — no-visual FaceDriver for unrigged Tripo amy.glb.
//
// Painted face (eyes + smile) stays as-is. Overlay planes for lids/mouth
// looked wrong on this mesh, so nothing is drawn. Animation hooks still call
// setBlink / setMouthOpen; values are stored only.

import * as THREE from "three";
import type { FaceDriver, FaceGaze } from "./face-driver";

export const AMY_FACE_LANDMARKS = {
  leftEye: new THREE.Vector3(-0.076, 0.152, -0.322),
  rightEye: new THREE.Vector3(0.08, 0.152, -0.322),
  mouth: new THREE.Vector3(0.002, 0.062, -0.342),
  leftCheek: new THREE.Vector3(-0.08, 0.12, -0.31),
  rightCheek: new THREE.Vector3(0.085, 0.12, -0.31),
  eyeWidth: 0.062,
  eyeHeight: 0.04,
  mouthWidth: 0.07,
  mouthHeight: 0.026,
} as const;

export class ProceduralFaceDriver implements FaceDriver {
  readonly kind = "procedural" as const;
  readonly hasBlink = false;
  readonly hasMouth = false;
  readonly hasSmile = true;

  private readonly root: THREE.Group;
  private blinkValue = 0;
  private smileValue = 0.18;
  private mouthOpenValue = 0;
  private disposed = false;

  constructor(head: THREE.Object3D) {
    for (const child of [...head.children]) {
      if (
        child.name === "AmyProceduralFace" ||
        child.name.startsWith("AmyProc")
      ) {
        head.remove(child);
        child.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material | undefined)?.dispose();
        });
      }
    }

    this.root = new THREE.Group();
    this.root.name = "AmyProceduralFace";
    head.add(this.root);
  }

  setBlink(value: number): void {
    if (this.disposed) return;
    this.blinkValue = clamp01(value);
  }

  setSmile(value: number): void {
    if (this.disposed) return;
    this.smileValue = clamp01(value);
  }

  lerpSmile(target: number, alpha: number): void {
    this.setSmile(this.smileValue + (clamp01(target) - this.smileValue) * alpha);
  }

  setMouthOpen(value: number): void {
    if (this.disposed) return;
    this.mouthOpenValue = clamp01(value);
  }

  setEyeHighlight(_value: number): void {}

  setEyeOpen(_value: number): void {}

  setCheekLift(_value: number): void {}

  setGaze(_gaze: FaceGaze): void {}

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.parent?.remove(this.root);
  }

  getOverlayState(): {
    blink: number;
    mouthOpen: number;
    lidVisible: boolean;
    mouthOpenVisible: boolean;
    depthTest: boolean;
    lidUsesSoftMap: boolean;
  } {
    return {
      blink: this.blinkValue,
      mouthOpen: this.mouthOpenValue,
      lidVisible: false,
      mouthOpenVisible: false,
      depthTest: false,
      lidUsesSoftMap: false,
    };
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
