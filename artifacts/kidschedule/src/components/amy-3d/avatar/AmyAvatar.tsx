// AmyAvatar — the living mascot, rendered INSIDE a react-three-fiber <Canvas>.
//
// Loads the existing amy.glb (no geometry changes — liveliness is 100% runtime)
// and layers four reusable animation systems on top:
//   • useIdleAnimation — float, breathing, sway, micro head-tilts
//   • useEyeMovement   — idle saccades + desktop cursor tracking
//   • useBlink         — natural 3–5s blinks with the occasional double-blink
//   • useLipSync       — viseme controller (event-driven or procedural)
// plus an animated neon halo and a speaking "attentive" posture.
//
// All transform writes funnel through a single shared pose buffer + one compose
// frame, so the hooks never fight over the group's rotation/position. Morph
// features auto-detect blend shapes and no-op when the rig (e.g. a raw Tripo
// head) has none — the avatar still feels alive via motion, gaze and halo.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { isMouthMoving } from "@/lib/amy-3d/use-amy-3d-state";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import { MorphTargetManager } from "./visemes";
import { createPose } from "./pose";
import { useIdleAnimation } from "./useIdleAnimation";
import { useEyeMovement } from "./useEyeMovement";
import { useBlink } from "./useBlink";
import { useLipSync, type LipSyncController } from "./useLipSync";
import { useAmyAnimationState } from "./useAmyAnimationState";
import { AMY_GLTF_FACING_Y } from "@/lib/amy-3d/amy-gltf-clips";
import { sanitizeAmyGltfClips } from "@/lib/amy-3d/sanitize-amy-gltf-clips";

const DEG = Math.PI / 180;
const FIT_HEIGHT = 1.7; // target world-space height of the head
const HEAD_BONE_KEYS = ["head", "neck"];
const EYE_BONE_KEYS = ["lefteye", "righteye", "eye_l", "eye_r", "eyeball"];

// Per-state halo colour (matches the neon glow design tokens).
const HALO_COLOR: Record<Amy3DState, string> = {
  idle: "#8B5CF6",
  listening: "#22D3EE",
  thinking: "#EC4899",
  speaking: "#A855F7",
  celebrating: "#FBBF24",
  encouraging: "#A78BFA",
};

export interface AmyAvatarProps {
  url: string;
  state: Amy3DState;
  /** Speech Coach pre-session: greeting wave then continuous warmup loop. */
  waitingForSession?: boolean;
  /** Neon torus above the head — off for Speech Coach (reads as a stray arc). */
  showHalo?: boolean;
  /** Scales the rig inside the canvas (1 = default framing). */
  modelScale?: number;
  /** Receives the lip-sync controller so a future TTS layer can push visemes. */
  onLipSyncReady?: (controller: LipSyncController) => void;
}

function findOne(root: THREE.Object3D, keys: string[]): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (hit) return;
    const n = o.name?.toLowerCase() ?? "";
    if (n && keys.some((k) => n.includes(k))) hit = o;
  });
  return hit;
}

function findAll(root: THREE.Object3D, keys: string[]): THREE.Object3D[] {
  const hits: THREE.Object3D[] = [];
  root.traverse((o) => {
    const n = o.name?.toLowerCase() ?? "";
    if (n && keys.some((k) => n.includes(k))) hits.push(o);
  });
  return hits;
}

export function AmyAvatar({
  url,
  state,
  waitingForSession,
  showHalo = true,
  modelScale = 1,
  onLipSyncReady,
}: AmyAvatarProps) {
  const gltf = useGLTF(url);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const pose = useMemo(() => createPose(), []);

  const outer = useRef<THREE.Group>(null);
  const animRoot = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);

  const sanitizedClips = useMemo(
    () => sanitizeAmyGltfClips(gltf.animations),
    [gltf.animations],
  );
  const { actions } = useAnimations(sanitizedClips, animRoot);
  const skeletalActive = useAmyAnimationState({
    actions,
    clips: sanitizedClips,
    state,
    reduced,
    waitingForSession,
  });

  // Clone so multiple hero instances each get independent morph/transform state.
  const built = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fit = (FIT_HEIGHT * modelScale) / maxDim;

    const manager = new MorphTargetManager();
    manager.resolve(scene);

    const headObj = findOne(scene, HEAD_BONE_KEYS);
    const eyeObjs = findAll(scene, EYE_BONE_KEYS);
    // Halo y above the very top of the head, in centered+scaled space.
    const haloY = (box.max.y - center.y) * fit + 0.12;

    return {
      scene,
      manager,
      fit,
      offset: center.clone().multiplyScalar(-fit),
      headObj,
      eyeObjs,
      haloY,
      hasEyeObjs: eyeObjs.length > 0,
      hasHeadObj: !!headObj,
    };
  }, [gltf.scene, modelScale]);

  // Animation layers (each is a single-writer of its channel).
  const attentive = state === "speaking" || state === "celebrating";
  const proceduralDamp = skeletalActive ? 0.22 : 1;
  useIdleAnimation(pose, { reduced, attentive, floatAmplitude: 0.015 * proceduralDamp });
  useEyeMovement(pose, { reduced, attentive, skeletalDamp: proceduralDamp });
  useBlink(built.manager, { reduced: reduced || !built.manager.hasBlink });
  const lipSync = useLipSync(built.manager, {
    speaking: isMouthMoving(state),
    reduced,
  });

  // Expose the controller upward (optional; for real viseme timelines later).
  useEffect(() => {
    onLipSyncReady?.(lipSync);
  }, [lipSync, onLipSyncReady]);

  // Reset morphs when the model is swapped / unmounted.
  useEffect(() => {
    const mgr = built.manager;
    return () => mgr.dispose();
  }, [built.manager]);

  // Single compose frame — registered last, so it runs after every hook has
  // written its slice. Applies the composed pose to real Object3Ds.
  useFrame((ctx) => {
    const g = outer.current;
    if (!g) return;
    const { idle, gaze } = pose;

    // Speaking lean: a touch forward + slight smile (when the rig supports it).
    const lean = attentive && !reduced ? 4 * DEG : 0;
    built.manager.lerpSmile(attentive ? 0.4 : 0, 0.1);

    g.position.y = idle.posY;
    g.scale.setScalar(idle.scale);

    // If the rig has no head/eye objects, fold gaze into the whole-head turn so
    // Amy still visibly looks around / toward the cursor.
    const headFold = built.hasHeadObj ? 0 : 1;
    g.rotation.x = idle.rotX - lean + gaze.headPitch * headFold;
    g.rotation.y = idle.rotY + gaze.headYaw * headFold;
    g.rotation.z = idle.rotZ;

    if (built.headObj && proceduralDamp > 0.35) {
      built.headObj.rotation.y = gaze.headYaw * proceduralDamp;
      built.headObj.rotation.x = gaze.headPitch * proceduralDamp;
    }
    if (built.hasEyeObjs) {
      for (const eye of built.eyeObjs) {
        eye.rotation.y = gaze.eyeYaw;
        eye.rotation.x = gaze.eyePitch;
      }
    }

    // Halo: slow pulse (scale 1.0–1.05) + glow intensity variation.
    if (showHalo && halo.current && haloMat.current) {
      const t = ctx.clock.elapsedTime;
      const pulse = reduced ? 1 : 1 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.05;
      halo.current.scale.setScalar(pulse);
      haloMat.current.opacity = reduced ? 0.55 : 0.4 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.35;
    }
  });

  const haloColor = HALO_COLOR[state];

  return (
    <group ref={outer}>
      {/* Centered + uniformly scaled model (skeletal clips target this root). */}
      <group
        ref={animRoot}
        position={built.offset}
        scale={built.fit}
        rotation={[0, AMY_GLTF_FACING_Y, 0]}
      >
        <primitive object={built.scene} />
      </group>

      {showHalo && (
        <mesh ref={halo} position={[0, built.haloY, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.045, 16, 48]} />
          <meshBasicMaterial
            ref={haloMat}
            color={haloColor}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

export default AmyAvatar;
