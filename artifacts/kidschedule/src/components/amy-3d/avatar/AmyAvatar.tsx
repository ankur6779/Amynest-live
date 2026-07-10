// AmyAvatar — the living mascot, rendered INSIDE a react-three-fiber <Canvas>.
//
// Layers (each with independent organic phase — never start together):
//   • useIdleAnimation — fbm breathing, sway, listening nods (6–10s)
//   • useEyeMovement   — noise gaze, thinking glance, speech eye react
//   • useBlink         — lids + cheek lift + smile boost
//   • useLipSync       — jaw / visemes from speech energy
//   • compose          — slow smile drift, face channels → FaceDriver
//
// FaceDriver prefers GLB morphs; otherwise Head-parented procedural overlays.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { isMouthMoving } from "@/lib/amy-3d/use-amy-3d-state";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import { MorphTargetManager } from "./visemes";
import { createFaceDriver, type HybridFaceDriver } from "./hybrid-face-driver";
import { createPose } from "./pose";
import { expressionForState } from "./expression-presets";
import { useIdleAnimation } from "./useIdleAnimation";
import { useEyeMovement } from "./useEyeMovement";
import { useBlink } from "./useBlink";
import { useLipSync, type LipSyncController } from "./useLipSync";
import { useEmotionalPresence } from "./useEmotionalPresence";
import { useAmyAnimationState } from "./useAmyAnimationState";
import { AMY_GLTF_FACING_Y } from "@/lib/amy-3d/amy-gltf-clips";
import { sanitizeAmyGltfClips } from "@/lib/amy-3d/sanitize-amy-gltf-clips";
import { createOrganicPhases, organic } from "./organic-noise";
import { getQaFaceOverride } from "./qa-face-override";

/** DEV QA screenshot hold — URL or button override on amy-avatar-qa only. */
function readQaFaceHold(): { blink?: number; mouthOpen?: number } | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  if (!window.location.pathname.includes("amy-avatar-qa")) return null;
  const hold = new URLSearchParams(window.location.search).get("faceHold");
  if (hold === "blink") return { blink: 0.9, mouthOpen: 0 };
  if (hold === "talk") return { blink: 0, mouthOpen: 0.65 };
  return getQaFaceOverride();
}

const DEG = Math.PI / 180;
const FIT_HEIGHT = 1.7;
const HEAD_BONE_KEYS = ["head", "neck"];
const EYE_BONE_KEYS = ["lefteye", "righteye", "eye_l", "eye_r", "eyeball"];
const HAND_BONE_KEYS = ["l_hand", "r_hand", "lefthand", "righthand", "hand_l", "hand_r"];

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
  waitingForSession?: boolean;
  showHalo?: boolean;
  modelScale?: number;
  verticalOffset?: number;
  onLipSyncReady?: (controller: LipSyncController) => void;
  /** Presentation-only 0..1 energy — drives smile / eyes / gesture amp. */
  speechEnergyRef?: RefObject<number>;
}

function findOne(root: THREE.Object3D, keys: string[]): THREE.Object3D | null {
  let best: THREE.Object3D | null = null;
  let bestScore = -1;
  root.traverse((o) => {
    const n = o.name?.toLowerCase() ?? "";
    if (!n) return;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!n.includes(k)) continue;
      const exact = n === k ? 100 : 0;
      const score = exact + (keys.length - i) * 10;
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
  });
  return best;
}

function findAll(root: THREE.Object3D, keys: string[]): THREE.Object3D[] {
  const hits: THREE.Object3D[] = [];
  root.traverse((o) => {
    const n = o.name?.toLowerCase() ?? "";
    if (n && keys.some((k) => n.includes(k))) hits.push(o);
  });
  return hits;
}

/** Remove leftover procedural face meshes (HMR / cache pollution). */
function purgeAmyProcOverlays(root: THREE.Object3D): void {
  const doomed: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (
      o.name === "AmyProceduralFace" ||
      o.name.startsWith("AmyProc")
    ) {
      doomed.push(o);
    }
  });
  for (const o of doomed) {
    o.parent?.remove(o);
    o.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else (mat as THREE.Material | undefined)?.dispose();
      }
    });
  }
}

export function AmyAvatar({
  url,
  state,
  waitingForSession,
  showHalo = true,
  modelScale = 1,
  verticalOffset = 0,
  onLipSyncReady,
  speechEnergyRef,
}: AmyAvatarProps) {
  const gltf = useGLTF(url);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const pose = useMemo(() => createPose(), []);
  const expression = expressionForState(state);
  const smilePhases = useRef(createOrganicPhases());
  const requestBlinkRef = useRef(false);
  const pendingBlinkClear = useRef(0);

  const outer = useRef<THREE.Group>(null);
  const animRoot = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const faceRef = useRef<HybridFaceDriver | null>(null);
  const energyInternal = useRef(0);
  const energyRef = speechEnergyRef ?? energyInternal;
  const handRest = useRef<Map<THREE.Object3D, number>>(new Map());

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

  const built = useMemo(() => {
    // Prior procedural drivers may have parented overlays onto the cached
    // useGLTF scene; strip them from the source before cloning.
    purgeAmyProcOverlays(gltf.scene);

    const scene = cloneSkeleton(gltf.scene) as THREE.Group;
    purgeAmyProcOverlays(scene);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fit = (FIT_HEIGHT * modelScale) / maxDim;

    const morph = new MorphTargetManager();
    morph.resolve(scene);

    const headObj = findOne(scene, HEAD_BONE_KEYS);
    const eyeObjs = findAll(scene, EYE_BONE_KEYS);
    const handObjs = findAll(scene, HAND_BONE_KEYS);
    const face = createFaceDriver(morph, headObj);
    const haloY = (box.max.y - center.y) * fit + 0.12;

    return {
      scene,
      morph,
      face,
      fit,
      offset: center.clone().multiplyScalar(-fit),
      headObj,
      eyeObjs,
      handObjs,
      haloY,
      hasEyeObjs: eyeObjs.length > 0,
      hasHeadObj: !!headObj,
    };
  }, [gltf.scene, modelScale]);

  faceRef.current = built.face;

  useEffect(() => {
    handRest.current.clear();
    for (const h of built.handObjs) {
      handRest.current.set(h, h.scale.x);
    }
  }, [built.handObjs]);

  const attentive = state === "speaking" || state === "celebrating";
  const proceduralDamp = skeletalActive ? 0.22 : 1;

  useEmotionalPresence({ state, reduced, pose });

  useIdleAnimation(pose, {
    reduced,
    attentive,
    floatAmplitude: 0.012 * proceduralDamp,
    expression,
    speechEnergyRef: energyRef,
    requestBlinkRef,
  });
  useEyeMovement(pose, {
    reduced,
    attentive: attentive || state === "listening",
    skeletalDamp: proceduralDamp,
    expression,
    thinkingActive: state === "thinking",
    face: built.face,
    speechEnergyRef: energyRef,
    requestBlinkRef,
  });
  useBlink(built.face, {
    reduced: reduced || !built.face.hasBlink,
    expression,
    pose,
  });
  const lipSync = useLipSync(built.face, {
    speaking: isMouthMoving(state),
    reduced,
    speechEnergyRef: energyRef,
  });

  useEffect(() => {
    onLipSyncReady?.(lipSync);
  }, [lipSync, onLipSyncReady]);

  useEffect(() => {
    const face = built.face;
    return () => face.dispose();
  }, [built.face]);

  // Single compose frame — smile drift, face channels, head/hand emphasis.
  useFrame((ctx) => {
    const g = outer.current;
    if (!g) return;
    const { idle, gaze, face: faceLife } = pose;
    const t = ctx.clock.elapsedTime;
    const sp = smilePhases.current;

    // Thinking glance requested a blink — soft one-shot, then clear.
    if (requestBlinkRef.current && built.face.hasBlink) {
      requestBlinkRef.current = false;
      faceLife.blink = 1;
      faceLife.cheekLift = 0.4;
      faceLife.smileBoost = Math.max(faceLife.smileBoost, 0.03);
      built.face.setBlink(0.85);
      pendingBlinkClear.current = t + 0.14;
    }
    if (pendingBlinkClear.current > 0 && t >= pendingBlinkClear.current) {
      built.face.setBlink(0);
      faceLife.blink = 0;
      faceLife.cheekLift *= 0.5;
      pendingBlinkClear.current = 0;
    }

    const raw = Math.max(0, Math.min(1, energyRef.current ?? 0));
    pose.energy.level += (raw - pose.energy.level) * 0.2;
    const energy = pose.energy.level;

    // Smile: blended base (presence) + organic drift + boosts. Never snaps.
    // Happy 25% / listening 15% / thinking 10% / talking dynamic.
    let smileTarget = pose.face.smileBase || expression.smile;
    smileTarget += organic(t, sp.smile, 0.07, 163) * (expression.smileDrift ?? 0.03);
    if (isMouthMoving(state) && pose.presence.phase !== "anticipate") {
      smileTarget =
        pose.face.smileBase +
        energy * 0.12 +
        organic(t, sp.smile + 8, 0.35, 167) * 0.04;
    }
    smileTarget += faceLife.smileBoost;
    faceLife.smileBoost *= 0.94;

    if (!reduced) {
      // ~220ms blend (alpha ≈ 0.08 at 60fps for 220ms tau).
      built.face.lerpSmile(THREE.MathUtils.clamp(smileTarget, 0.05, 0.45), 0.08);
      built.face.setCheekLift?.(faceLife.cheekLift);
      built.face.setEyeHighlight(faceLife.eyeBright);
      built.face.setEyeOpen?.(faceLife.eyeOpen);
    }

    g.position.y = idle.posY + pose.presence.headLift * 0.08;
    const celebrateBounce =
      (state === "celebrating" || pose.presence.phase === "celebrateSettle") &&
      !reduced
        ? 1 +
          Math.abs(organic(t, sp.breath, 0.55, 173)) *
            (state === "celebrating" ? 0.014 : 0.006)
        : 1;
    g.scale.setScalar(idle.scale * celebrateBounce);

    const headFold = built.hasHeadObj ? 0 : 1;
    const speakEmphasis =
      isMouthMoving(state) &&
      !reduced &&
      pose.presence.phase !== "anticipate"
        ? energy * 0.45 * DEG * idle.gestureAmp
        : 0;

    g.rotation.x =
      idle.rotX + gaze.headPitch * headFold - speakEmphasis * 0.35;
    g.rotation.y = idle.rotY + gaze.headYaw * headFold;
    g.rotation.z = idle.rotZ;

    if (built.headObj && proceduralDamp > 0.15) {
      const damp = Math.max(proceduralDamp, 0.35);
      built.headObj.rotation.y = gaze.headYaw * damp;
      built.headObj.rotation.x =
        gaze.headPitch * damp - speakEmphasis * 0.55 * damp;
    }
    if (built.hasEyeObjs) {
      for (const eye of built.eyeObjs) {
        eye.rotation.y = gaze.eyeYaw;
        eye.rotation.x = gaze.eyePitch;
      }
    }

    // Hand gesture intensity from speech energy.
    if (isMouthMoving(state) && !reduced && built.handObjs.length) {
      const handAmp = 1 + energy * 0.04 * idle.gestureAmp;
      for (const h of built.handObjs) {
        const rest = handRest.current.get(h) ?? 1;
        h.scale.setScalar(rest * handAmp);
      }
    } else if (built.handObjs.length) {
      for (const h of built.handObjs) {
        const rest = handRest.current.get(h) ?? 1;
        const cur = h.scale.x;
        h.scale.setScalar(cur + (rest - cur) * 0.15);
      }
    }

    if (showHalo && halo.current && haloMat.current) {
      const pulse = reduced
        ? 1
        : 1 + (organic(t, sp.breath + 20, 0.2, 179) * 0.5 + 0.5) * 0.05;
      halo.current.scale.setScalar(pulse);
      haloMat.current.opacity = reduced
        ? 0.55
        : 0.4 + (organic(t, sp.breath + 21, 0.2, 181) * 0.5 + 0.5) * 0.35;
    }

    // DEV QA only: hold a face pose for screenshots (does not change schedulers).
    const qa = readQaFaceHold();
    if (qa) {
      if (qa.blink != null) built.face.setBlink(qa.blink);
      if (qa.mouthOpen != null) built.face.setMouthOpen(qa.mouthOpen);
      const proc = built.face.proceduralDriver;
      const overlay = proc?.getOverlayState?.();
      document.documentElement.dataset.amyQaFace = `b${qa.blink ?? "-"}-m${qa.mouthOpen ?? "-"}`;
      document.documentElement.dataset.amyQaOverlay = overlay
        ? `proc=1;lid=${overlay.lidVisible ? 1 : 0};mouth=${overlay.mouthOpenVisible ? 1 : 0};bv=${overlay.blink.toFixed(2)};mv=${overlay.mouthOpen.toFixed(2)}`
        : `proc=0;hasBlink=${built.face.hasBlink ? 1 : 0}`;
    } else if (document.documentElement.dataset.amyQaFace) {
      delete document.documentElement.dataset.amyQaFace;
      delete document.documentElement.dataset.amyQaOverlay;
    }
  });

  const haloColor = HALO_COLOR[state];

  return (
    <group ref={outer}>
      <group
        ref={animRoot}
        position={[built.offset.x, built.offset.y + verticalOffset, built.offset.z]}
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
