// Live 3D Amy avatar — react-three-fiber WebGL stage for the rigged model.
//
// Rendered ONLY on hero spots via <AmyAvatar tier="hero"> and ONLY once a rigged
// model (public/amy-3d/amy.glb) is present. Lazy-loaded so the three.js stack
// never ships in the main bundle.
//
// This file sits ABOVE the Speech Coach engine: it reads a derived visual
// `state` (and the pointer for eye-tracking) and never touches audio / mic /
// AudioContext (see speech-coach-engine-freeze.mdc). Lip-sync is a time-based
// jaw/viseme oscillation gated on `state === "speaking"` — no audio amplitude.
//
// Animation spec (from design brief):
//   blinkInterval        = random(3000, 5000) ms
//   blinkDuration        = 120 ms
//   idleBreathingAmplitude = 0.01
//   headTiltAmplitude    = 3deg
//   eyeTracking          = enabled (pointer-driven)
//   lipSync              = viseme/jaw morph based

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { isMouthMoving } from "@/lib/amy-3d/use-amy-3d-state";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

// Per-state neon rim-light colour (matches the halo glow tokens).
const RIM_COLOR: Record<Amy3DState, string> = {
  idle: "#8B5CF6",
  listening: "#22D3EE",
  thinking: "#EC4899",
  speaking: "#A855F7",
  celebrating: "#FBBF24",
  encouraging: "#A78BFA",
};

const BREATHE_AMP = 0.01; // idleBreathingAmplitude
const TILT_RAD = (3 * Math.PI) / 180; // headTiltAmplitude = 3deg
const BLINK_DUR = 0.12; // 120ms
const EYE_TRACK_MAX = (8 * Math.PI) / 180; // max eye/head turn toward pointer

export interface Amy3DStageProps {
  state: Amy3DState;
  size: number;
  modelUrl?: string;
  className?: string;
}

// Candidate morph-target / bone names exported by common rigs (ARKit, Mixamo,
// Ready Player Me, VRoid). We auto-detect whatever the model provides.
const JAW_KEYS = ["jawOpen", "mouthOpen", "viseme_aa", "mouth_open", "JawOpen", "vrc.v_aa"];
const BLINK_KEYS = [
  "eyesClosed",
  "blink",
  "eyeBlink",
  "eyeBlinkLeft",
  "blink_L",
  "vrc.blink",
];
const HEAD_BONE_KEYS = ["head", "Head", "mixamorigHead", "neck", "Neck"];
const EYE_BONE_KEYS = ["lefteye", "righteye", "eye"];

function findMorph(scene: THREE.Object3D, keys: string[]) {
  let mesh: THREE.Mesh | null = null;
  let index = -1;
  scene.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (index < 0 && m.morphTargetDictionary) {
      const dict = m.morphTargetDictionary;
      const key = keys.find((k) => k in dict);
      if (key) {
        mesh = m;
        index = dict[key];
      }
    }
  });
  return { mesh, index };
}

function findBone(scene: THREE.Object3D, keys: string[]): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  scene.traverse((obj) => {
    if (found) return;
    const name = obj.name?.toLowerCase() ?? "";
    if (keys.some((k) => name.includes(k.toLowerCase()))) found = obj;
  });
  return found;
}

function setMorph(mesh: THREE.Mesh | null, index: number, value: number) {
  if (mesh && index >= 0 && mesh.morphTargetInfluences) {
    mesh.morphTargetInfluences[index] = value;
  }
}

function AmyModel({ url, state }: { url: string; state: Amy3DState }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = gltf.scene;
  const root = useRef<THREE.Group>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const jaw = useMemo<{ mesh: THREE.Mesh | null; index: number }>(
    () => findMorph(scene, JAW_KEYS),
    [scene],
  );
  const blink = useMemo<{ mesh: THREE.Mesh | null; index: number }>(
    () => findMorph(scene, BLINK_KEYS),
    [scene],
  );
  const headBone = useMemo(() => findBone(scene, HEAD_BONE_KEYS), [scene]);
  const eyeBone = useMemo(() => findBone(scene, EYE_BONE_KEYS), [scene]);

  // Blink scheduler (wall-clock based).
  const blinkState = useRef({ next: 1.5, active: false, start: 0 });

  useFrame((ctx) => {
    const g = root.current;
    if (!g) return;
    const t = ctx.clock.elapsedTime;

    if (!reduced) {
      // Idle breathing (subtle vertical scale) + gentle float.
      const breathe = 1 + Math.sin(t * 1.6) * BREATHE_AMP;
      g.scale.y = breathe;
      g.position.y = Math.sin(t * 1.4) * 0.015;

      // Slight head tilt / movement.
      g.rotation.z = Math.sin(t * 0.7) * TILT_RAD;
      g.rotation.x = Math.sin(t * 0.5) * TILT_RAD * 0.5;

      // Eye-tracking: turn head/eyes gently toward the pointer.
      const px = THREE.MathUtils.clamp(ctx.pointer.x, -1, 1);
      const py = THREE.MathUtils.clamp(ctx.pointer.y, -1, 1);
      g.rotation.y = px * EYE_TRACK_MAX * 0.6;
      if (headBone) {
        headBone.rotation.y = px * EYE_TRACK_MAX * 0.5;
        headBone.rotation.x = -py * EYE_TRACK_MAX * 0.4;
      }
      if (eyeBone) {
        eyeBone.rotation.y = px * EYE_TRACK_MAX;
        eyeBone.rotation.x = -py * EYE_TRACK_MAX;
      }

      // Blink.
      const bs = blinkState.current;
      if (!bs.active && t >= bs.next) {
        bs.active = true;
        bs.start = t;
      }
      if (bs.active) {
        const dt = t - bs.start;
        // 0 → 1 → 0 over BLINK_DUR.
        const v = dt < BLINK_DUR / 2 ? dt / (BLINK_DUR / 2) : 1 - (dt - BLINK_DUR / 2) / (BLINK_DUR / 2);
        setMorph(blink.mesh, blink.index, THREE.MathUtils.clamp(v, 0, 1));
        if (dt >= BLINK_DUR) {
          bs.active = false;
          setMorph(blink.mesh, blink.index, 0);
          bs.next = t + 3 + Math.random() * 2; // 3000–5000ms
        }
      }
    }

    // Lip-sync (freeze-safe time-based jaw/viseme oscillation while speaking).
    if (jaw.mesh && jaw.index >= 0 && jaw.mesh.morphTargetInfluences) {
      const target = isMouthMoving(state)
        ? Math.max(0, 0.18 + 0.82 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 5.5)))
        : 0;
      const cur = jaw.mesh.morphTargetInfluences[jaw.index];
      jaw.mesh.morphTargetInfluences[jaw.index] = cur + (target - cur) * 0.5;
    }
  });

  return <primitive ref={root} object={scene} />;
}

export default function Amy3DStage({ state, size, modelUrl, className }: Amy3DStageProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rim = RIM_COLOR[state];

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        frameloop={reduced ? "demand" : "always"}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0.05, 3.0], fov: 30 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-3, 1, 2]} intensity={1.4} color={rim} distance={12} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color="#EC4899" distance={12} />
        <Suspense fallback={null}>
          {modelUrl ? <AmyModel url={modelUrl} state={state} /> : null}
        </Suspense>
      </Canvas>
    </div>
  );
}
