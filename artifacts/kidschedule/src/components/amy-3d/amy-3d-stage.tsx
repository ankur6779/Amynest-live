// Live 3D Amy avatar — react-three-fiber WebGL stage host.
//
// Rendered ONLY on hero spots via <AmyAvatar tier="hero"> and ONLY once a
// model (public/amy-3d/amy.glb) is present. Lazy-loaded so the three.js stack
// never ships in the main bundle.
//
// This file sits ABOVE the Speech Coach engine: it reads a derived visual
// `state` (and the pointer for eye-tracking) and never touches audio / mic /
// AudioContext (see speech-coach-engine-freeze.mdc). Lip-sync is driven by the
// viseme controller in ./avatar — event-driven when a timeline is pushed, or a
// freeze-safe time-based mouth-flap gated on `state === "speaking"` otherwise.
//
// The Canvas just provides camera + lighting; all the "alive" behaviour lives
// in <AmyAvatar> (./avatar/AmyAvatar.tsx) and its hooks.

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { AMY_MODEL_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import { AmyAvatar } from "./avatar/AmyAvatar";

// Per-state neon rim-light colour (matches the halo glow tokens).
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
  modelUrl?: string;
  className?: string;
}

export default function Amy3DStage({ state, size, modelUrl, className }: Amy3DStageProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rim = RIM_COLOR[state];
  const url = modelUrl ?? AMY_MODEL_SRC;

  useEffect(() => {
    useGLTF.preload(url);
  }, [url]);

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        frameloop={reduced ? "demand" : "always"}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0.15, 3.6], fov: 30 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-3, 1, 2]} intensity={1.4} color={rim} distance={12} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color="#EC4899" distance={12} />
        <Suspense fallback={null}>
          <AmyAvatar url={url} state={state} />
        </Suspense>
      </Canvas>
    </div>
  );
}
