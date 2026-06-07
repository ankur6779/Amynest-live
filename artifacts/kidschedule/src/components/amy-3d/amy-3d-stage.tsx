// Live 3D Amy avatar — react-three-fiber WebGL stage.
//
// Rendered ONLY on hero spots via <AmyAvatar tier="hero">, lazy-loaded so the
// three.js stack never ships in the main bundle. This file sits ABOVE the
// Speech Coach engine: it reads a derived visual `state` (and nothing else) and
// never touches audio/mic/AudioContext (see speech-coach-engine-freeze.mdc).
//
// Phase 1 ships a PROCEDURAL head (three primitives) as the prototype model so
// the feature works with zero external assets. A proper rigged `.glb` can be
// dropped in later by passing `modelUrl` — see AmyGltf below.

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { isMouthMoving } from "@/lib/amy-3d/use-amy-3d-state";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

// Brand colours mirrored from the 2D AmyIcon so the 3D head stays on-brand.
const COLORS = {
  face: "#F6B97A",
  cap: "#9B6FD4",
  capShine: "#C4A0FF",
  eye: "#1A1530",
  cheek: "#FFB4C8",
  mouth: "#6E2E2E",
} as const;

// Per-state neon rim-light colour (matches the ring glow tokens).
const RIM_COLOR: Record<Amy3DState, string> = {
  idle: "#8B5CF6",
  listening: "#22D3EE",
  thinking: "#EC4899",
  speaking: "#A855F7",
  celebrating: "#FBBF24",
  encouraging: "#A78BFA",
};

export interface Amy3DStageProps {
  state: Amy3DState;
  size: number;
  /** Optional rigged .glb (Phase 3). When omitted, the procedural head renders. */
  modelUrl?: string;
  className?: string;
}

// ── Procedural Amy head ───────────────────────────────────────────────────────
function ProceduralAmy({ state }: { state: Amy3DState }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Blink scheduling (wall-clock based, independent of frame rate).
  const blinkRef = useRef({ next: 1.2, closing: false, closeStart: 0 });

  useFrame((stateCtx) => {
    const g = groupRef.current;
    if (!g) return;
    const t = stateCtx.clock.elapsedTime;

    if (reduced) {
      // Calm static pose for reduced-motion users.
      g.position.y = 0;
      g.rotation.set(0, 0, 0);
      if (mouthRef.current) mouthRef.current.scale.y = isMouthMoving(state) ? 0.9 : 0.5;
      return;
    }

    // Base idle float + gentle look-around.
    let posY = Math.sin(t * 1.4) * 0.025;
    let rotX = 0;
    let rotY = Math.sin(t * 0.55) * 0.1;
    let rotZ = 0;

    switch (state) {
      case "listening":
        rotZ = Math.sin(t * 2.1) * 0.05;
        rotX = -0.06;
        break;
      case "thinking":
        rotY = Math.sin(t * 1.1) * 0.28;
        rotX = 0.05;
        break;
      case "celebrating":
        posY = Math.abs(Math.sin(t * 4.2)) * 0.12;
        rotZ = Math.sin(t * 6) * 0.06;
        break;
      case "encouraging":
        rotX = Math.sin(t * 2.4) * 0.06;
        break;
      default:
        break;
    }

    g.position.y = posY;
    g.rotation.set(rotX, rotY, rotZ);

    // Time-based lip-flap (freeze-safe — no audio amplitude used).
    if (mouthRef.current) {
      if (isMouthMoving(state)) {
        const fast = 0.5 + 0.5 * Math.sin(t * 13);
        const slow = 0.6 + 0.4 * Math.sin(t * 5.5);
        const open = 0.28 + fast * slow * 1.0;
        mouthRef.current.scale.y = Math.min(1.4, open);
      } else {
        // Ease back to a soft smile.
        mouthRef.current.scale.y += (0.42 - mouthRef.current.scale.y) * 0.2;
      }
    }

    // Blink.
    const blink = blinkRef.current;
    const le = leftEyeRef.current;
    const re = rightEyeRef.current;
    if (le && re) {
      if (!blink.closing && t >= blink.next) {
        blink.closing = true;
        blink.closeStart = t;
      }
      if (blink.closing) {
        const dt = t - blink.closeStart;
        const sy = dt < 0.06 ? 1 - dt / 0.06 : Math.min(1, (dt - 0.06) / 0.06);
        le.scale.y = Math.max(0.08, sy);
        re.scale.y = Math.max(0.08, sy);
        if (dt > 0.12) {
          blink.closing = false;
          le.scale.y = 1;
          re.scale.y = 1;
          blink.next = t + 2.4 + Math.random() * 1.8;
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh castShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color={COLORS.face} roughness={0.62} metalness={0.04} />
      </mesh>

      {/* Purple cap — sits on the top third of the head */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[1.05, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <meshStandardMaterial color={COLORS.cap} roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Cap shine band */}
      <mesh position={[0, 0.66, 0.0]} rotation={[Math.PI * 0.1, 0, 0]}>
        <torusGeometry args={[0.5, 0.022, 12, 48, Math.PI]} />
        <meshStandardMaterial color={COLORS.capShine} emissive={COLORS.capShine} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>

      {/* Cheeks */}
      <mesh position={[-0.58, -0.12, 0.66]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={COLORS.cheek} transparent opacity={0.6} roughness={0.8} />
      </mesh>
      <mesh position={[0.58, -0.12, 0.66]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={COLORS.cheek} transparent opacity={0.6} roughness={0.8} />
      </mesh>

      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.32, 0.12, 0.86]}>
        <sphereGeometry args={[0.14, 28, 28]} />
        <meshStandardMaterial color={COLORS.eye} roughness={0.3} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.32, 0.12, 0.86]}>
        <sphereGeometry args={[0.14, 28, 28]} />
        <meshStandardMaterial color={COLORS.eye} roughness={0.3} />
      </mesh>
      {/* Eye sparkles */}
      <mesh position={[-0.27, 0.18, 0.99]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.37, 0.18, 0.99]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>

      {/* Mouth — scaleY animates for the lip-flap */}
      <mesh ref={mouthRef} position={[0, -0.34, 0.9]} scale={[0.42, 0.42, 0.42]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color={COLORS.mouth} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ── Optional rigged GLB (Phase 3 hook) ────────────────────────────────────────
function AmyGltf({ url, state }: { url: string; state: Amy3DState }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = gltf.scene;
  const root = useRef<THREE.Group>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Find a mouth morph target / jaw bone for lip-sync if the rig provides one.
  const morph = useMemo<{ mesh: THREE.Mesh | null; index: number }>(() => {
    let mesh: THREE.Mesh | null = null;
    let index = -1;
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!mesh && m.morphTargetDictionary) {
        const dict = m.morphTargetDictionary;
        const key = ["jawOpen", "mouthOpen", "viseme_aa", "mouth_open"].find(
          (k) => k in dict,
        );
        if (key) {
          mesh = m;
          index = dict[key];
        }
      }
    });
    return { mesh, index };
  }, [scene]);

  useFrame((ctx) => {
    if (root.current && !reduced) {
      const t = ctx.clock.elapsedTime;
      root.current.rotation.y = Math.sin(t * 0.55) * 0.1;
      root.current.position.y = Math.sin(t * 1.4) * 0.02;
    }
    const { mesh, index } = morph;
    if (mesh && index >= 0 && mesh.morphTargetInfluences) {
      const t = ctx.clock.elapsedTime;
      const target = isMouthMoving(state)
        ? Math.max(0, 0.2 + 0.8 * Math.abs(Math.sin(t * 11)))
        : 0;
      mesh.morphTargetInfluences[index] +=
        (target - mesh.morphTargetInfluences[index]) * 0.4;
    }
  });

  return <primitive ref={root} object={scene} />;
}

// ── Stage ─────────────────────────────────────────────────────────────────────
export default function Amy3DStage({ state, size, modelUrl, className }: Amy3DStageProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rim = RIM_COLOR[state];

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        frameloop={reduced ? "demand" : "always"}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0.05, 5.0], fov: 30 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-3, 1, 2]} intensity={1.4} color={rim} distance={12} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color="#EC4899" distance={12} />
        <Suspense fallback={null}>
          {modelUrl ? (
            <AmyGltf url={modelUrl} state={state} />
          ) : (
            <ProceduralAmy state={state} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
