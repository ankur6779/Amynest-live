// ProceduralFaceDriver — head-attached facial life for unrigged Tripo GLBs.
//
// Parented to the Head bone so eyelids / pupils / mouth NEVER float in world
// space. Lightweight planes (no textures). HybridFaceDriver prefers morphs
// when present and only uses overlays for missing channels.

import * as THREE from "three";
import type { FaceDriver, FaceGaze } from "./face-driver";

/** Calibrated Head-local landmarks (from amy.glb mesh analysis). */
export const AMY_FACE_LANDMARKS = {
  leftEye: new THREE.Vector3(-0.09, 0.45, 0.295),
  rightEye: new THREE.Vector3(0.1, 0.45, 0.29),
  mouth: new THREE.Vector3(0.005, 0.355, 0.31),
  leftCheek: new THREE.Vector3(-0.095, 0.385, 0.28),
  rightCheek: new THREE.Vector3(0.105, 0.385, 0.275),
  eyeWidth: 0.055,
  eyeHeight: 0.028,
  mouthWidth: 0.07,
  mouthHeight: 0.028,
} as const;

const SKIN = 0xf2e6f8;
const LID_EDGE = 0xd8c9ea;
const HIGHLIGHT = 0xffffff;
const LIP = 0xe8a0b8;
const LIP_OPEN = 0x5a3048;
const CHEEK = 0xf0c4d4;

function makePlane(
  w: number,
  h: number,
  color: number,
  opacity: number,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  return mesh;
}

interface EyeRig {
  root: THREE.Group;
  lid: THREE.Mesh;
  highlight: THREE.Mesh;
  pupil: THREE.Mesh;
  brow: THREE.Mesh;
}

function buildEye(local: THREE.Vector3, side: "L" | "R"): EyeRig {
  const root = new THREE.Group();
  root.name = `AmyProcEye_${side}`;
  root.position.copy(local);
  root.position.z += 0.012;

  const lid = makePlane(
    AMY_FACE_LANDMARKS.eyeWidth * 1.05,
    AMY_FACE_LANDMARKS.eyeHeight * 1.15,
    SKIN,
    0,
  );
  lid.position.set(0, AMY_FACE_LANDMARKS.eyeHeight * 0.15, 0.001);
  lid.scale.y = 0.001;
  lid.visible = false;

  const highlight = makePlane(
    AMY_FACE_LANDMARKS.eyeWidth * 0.35,
    AMY_FACE_LANDMARKS.eyeHeight * 0.45,
    HIGHLIGHT,
    0.55,
  );
  highlight.position.set(
    side === "L" ? -0.008 : 0.008,
    AMY_FACE_LANDMARKS.eyeHeight * 0.15,
    0.002,
  );

  const pupil = makePlane(
    AMY_FACE_LANDMARKS.eyeWidth * 0.22,
    AMY_FACE_LANDMARKS.eyeHeight * 0.35,
    HIGHLIGHT,
    0.35,
  );
  pupil.position.set(0, 0, 0.0015);

  const brow = makePlane(
    AMY_FACE_LANDMARKS.eyeWidth * 1.05,
    AMY_FACE_LANDMARKS.eyeHeight * 0.25,
    LID_EDGE,
    0.25,
  );
  brow.position.set(0, AMY_FACE_LANDMARKS.eyeHeight * 0.55, 0.0005);

  root.add(brow, pupil, highlight, lid);
  return { root, lid, highlight, pupil, brow };
}

/**
 * Procedural face overlays parented to `head`. Safe on Android WebView —
 * tiny planes, no textures, no extra render loops.
 */
export class ProceduralFaceDriver implements FaceDriver {
  readonly kind = "procedural" as const;
  readonly hasBlink = true;
  readonly hasMouth = true;
  readonly hasSmile = true;

  private readonly root: THREE.Group;
  private readonly left: EyeRig;
  private readonly right: EyeRig;
  private readonly leftCheek: THREE.Mesh;
  private readonly rightCheek: THREE.Mesh;
  private readonly mouthClosed: THREE.Mesh;
  private readonly mouthOpen: THREE.Mesh;
  private readonly smileCurve: THREE.Mesh;

  private blinkValue = 0;
  private smileValue = 0.18;
  private mouthOpenValue = 0;
  private eyeBright = 1;
  private eyeOpen = 1;
  private cheekLift = 0;
  private disposed = false;

  constructor(head: THREE.Object3D) {
    this.root = new THREE.Group();
    this.root.name = "AmyProceduralFace";

    this.left = buildEye(AMY_FACE_LANDMARKS.leftEye, "L");
    this.right = buildEye(AMY_FACE_LANDMARKS.rightEye, "R");

    this.leftCheek = makePlane(0.04, 0.028, CHEEK, 0);
    this.leftCheek.name = "AmyProcCheek_L";
    this.leftCheek.position.copy(AMY_FACE_LANDMARKS.leftCheek);
    this.leftCheek.position.z += 0.01;
    this.leftCheek.visible = false;

    this.rightCheek = makePlane(0.04, 0.028, CHEEK, 0);
    this.rightCheek.name = "AmyProcCheek_R";
    this.rightCheek.position.copy(AMY_FACE_LANDMARKS.rightCheek);
    this.rightCheek.position.z += 0.01;
    this.rightCheek.visible = false;

    this.mouthClosed = makePlane(
      AMY_FACE_LANDMARKS.mouthWidth,
      AMY_FACE_LANDMARKS.mouthHeight * 0.35,
      LIP,
      0.55,
    );
    this.mouthClosed.name = "AmyProcMouthClosed";
    this.mouthClosed.position.copy(AMY_FACE_LANDMARKS.mouth);
    this.mouthClosed.position.z += 0.012;

    this.mouthOpen = makePlane(
      AMY_FACE_LANDMARKS.mouthWidth * 0.85,
      AMY_FACE_LANDMARKS.mouthHeight,
      LIP_OPEN,
      0,
    );
    this.mouthOpen.name = "AmyProcMouthOpen";
    this.mouthOpen.position.copy(AMY_FACE_LANDMARKS.mouth);
    this.mouthOpen.position.z += 0.013;
    this.mouthOpen.position.y -= 0.004;
    this.mouthOpen.visible = false;

    this.smileCurve = makePlane(
      AMY_FACE_LANDMARKS.mouthWidth * 1.15,
      AMY_FACE_LANDMARKS.mouthHeight * 0.22,
      LIP,
      0.4,
    );
    this.smileCurve.name = "AmyProcSmile";
    this.smileCurve.position.copy(AMY_FACE_LANDMARKS.mouth);
    this.smileCurve.position.z += 0.0115;
    this.smileCurve.position.y += 0.002;

    this.root.add(
      this.left.root,
      this.right.root,
      this.leftCheek,
      this.rightCheek,
      this.mouthClosed,
      this.mouthOpen,
      this.smileCurve,
    );
    head.add(this.root);

    this.applySmileVisual();
    this.applyMouthVisual();
    this.applyBlinkVisual();
    this.applyHighlightVisual();
    this.applyEyeOpenVisual();
    this.applyCheekVisual();
  }

  setBlink(value: number): void {
    if (this.disposed) return;
    this.blinkValue = clamp01(value);
    this.applyBlinkVisual();
  }

  setSmile(value: number): void {
    if (this.disposed) return;
    this.smileValue = clamp01(value);
    this.applySmileVisual();
  }

  lerpSmile(target: number, alpha: number): void {
    this.setSmile(this.smileValue + (clamp01(target) - this.smileValue) * alpha);
  }

  setMouthOpen(value: number): void {
    if (this.disposed) return;
    this.mouthOpenValue = clamp01(value);
    this.applyMouthVisual();
  }

  setEyeHighlight(value: number): void {
    if (this.disposed) return;
    this.eyeBright = Math.max(0.5, Math.min(1.4, value));
    this.applyHighlightVisual();
  }

  setEyeOpen(value: number): void {
    if (this.disposed) return;
    this.eyeOpen = Math.max(0.85, Math.min(1.18, value));
    this.applyEyeOpenVisual();
  }

  setCheekLift(value: number): void {
    if (this.disposed) return;
    this.cheekLift = clamp01(value);
    this.applyCheekVisual();
  }

  setGaze(gaze: FaceGaze): void {
    if (this.disposed) return;
    const max = 0.0055;
    const x = THREE.MathUtils.clamp(gaze.eyeYaw * 0.08, -max, max);
    const y = THREE.MathUtils.clamp(gaze.eyePitch * 0.08, -max, max);
    for (const eye of [this.left, this.right]) {
      eye.pupil.position.x = x;
      eye.pupil.position.y = y;
      eye.highlight.position.x =
        (eye === this.left ? -0.008 : 0.008) + x * 0.6;
      eye.highlight.position.y = AMY_FACE_LANDMARKS.eyeHeight * 0.15 + y * 0.6;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.parent?.remove(this.root);
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material;
        mat?.dispose();
      }
    });
  }

  private applyBlinkVisual(): void {
    const v = this.blinkValue;
    for (const eye of [this.left, this.right]) {
      if (v < 0.02) {
        eye.lid.visible = false;
        eye.lid.scale.y = 0.001;
        (eye.lid.material as THREE.MeshBasicMaterial).opacity = 0;
        eye.pupil.visible = true;
        eye.highlight.visible = true;
      } else {
        eye.lid.visible = true;
        eye.lid.scale.y = Math.max(0.001, v);
        (eye.lid.material as THREE.MeshBasicMaterial).opacity =
          0.92 * Math.min(1, v * 1.4);
        const hide = v > 0.55;
        eye.pupil.visible = !hide;
        eye.highlight.visible = !hide;
      }
    }
  }

  private applySmileVisual(): void {
    const s = this.smileValue;
    const closedMat = this.mouthClosed.material as THREE.MeshBasicMaterial;
    const smileMat = this.smileCurve.material as THREE.MeshBasicMaterial;
    const cheekY = this.cheekLift * 0.003;
    this.mouthClosed.scale.x = 1 + s * 0.35;
    this.mouthClosed.position.y = AMY_FACE_LANDMARKS.mouth.y + s * 0.004 + cheekY;
    closedMat.opacity = 0.35 + s * 0.35;
    this.smileCurve.scale.x = 0.85 + s * 0.45;
    this.smileCurve.position.y = AMY_FACE_LANDMARKS.mouth.y + 0.002 + s * 0.003 + cheekY;
    smileMat.opacity = 0.15 + s * 0.45;
  }

  private applyMouthVisual(): void {
    const o = this.mouthOpenValue;
    const openMat = this.mouthOpen.material as THREE.MeshBasicMaterial;
    const closedMat = this.mouthClosed.material as THREE.MeshBasicMaterial;
    if (o < 0.04) {
      this.mouthOpen.visible = false;
      openMat.opacity = 0;
      closedMat.opacity = 0.35 + this.smileValue * 0.35;
      this.mouthClosed.scale.y = 1;
    } else {
      this.mouthOpen.visible = true;
      openMat.opacity = Math.min(0.95, o * 1.1);
      this.mouthOpen.scale.y = 0.35 + o * 0.9;
      this.mouthOpen.scale.x = 0.75 + o * 0.35;
      closedMat.opacity = Math.max(
        0.08,
        (0.35 + this.smileValue * 0.35) * (1 - o * 0.85),
      );
      this.mouthClosed.scale.y = 1 - o * 0.4;
    }
  }

  private applyHighlightVisual(): void {
    const op = 0.35 * this.eyeBright;
    for (const eye of [this.left, this.right]) {
      (eye.highlight.material as THREE.MeshBasicMaterial).opacity = Math.min(
        0.75,
        op + 0.2,
      );
      (eye.pupil.material as THREE.MeshBasicMaterial).opacity = Math.min(
        0.55,
        0.25 * this.eyeBright,
      );
    }
  }

  private applyEyeOpenVisual(): void {
    // Tiny vertical squash/widen on the eye group — never cartoonish.
    const sy = this.eyeOpen;
    const sx = 1 + (1 - sy) * 0.35; // slight horizontal compensate when squashed
    for (const eye of [this.left, this.right]) {
      eye.root.scale.set(sx, sy, 1);
    }
  }

  private applyCheekVisual(): void {
    const c = this.cheekLift;
    for (const cheek of [this.leftCheek, this.rightCheek]) {
      if (c < 0.02) {
        cheek.visible = false;
        (cheek.material as THREE.MeshBasicMaterial).opacity = 0;
      } else {
        cheek.visible = true;
        (cheek.material as THREE.MeshBasicMaterial).opacity = Math.min(0.28, c * 0.35);
        cheek.scale.set(1 + c * 0.15, 1 + c * 0.25, 1);
        cheek.position.y =
          (cheek === this.leftCheek
            ? AMY_FACE_LANDMARKS.leftCheek.y
            : AMY_FACE_LANDMARKS.rightCheek.y) +
          c * 0.006;
      }
    }
    // Smile lifts slightly with cheeks.
    this.applySmileVisual();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
