// Amy3DStage — pure Canvas + lights + skeletal avatar. No loading/fallback
// logic lives here: Amy3DAvatar (the host) owns the Suspense/ErrorBoundary
// that decides whether this component is even mounted.

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { AMY_MODEL_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import { AmyAvatar } from "./avatar/AmyAvatar";

// Warm the GLTF cache the moment this chunk is evaluated (i.e. as soon as the
// lazy import resolves) so the <AmyAvatar> below almost never actually
// suspends once this module is live.
useGLTF.preload(AMY_MODEL_SRC);

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
  /** Speech Coach pre-session warmup loop. */
  waitingForSession?: boolean;
  showHalo?: boolean;
  modelScale?: number;
  /** Fires once after the GLB has actually mounted (fully loaded, no error). */
  onReady?: () => void;
}

export default function Amy3DStage({
  state,
  size,
  modelUrl,
  className,
  waitingForSession,
  showHalo = true,
  modelScale = 1,
  onReady,
}: Amy3DStageProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rim = RIM_COLOR[state];
  const url = modelUrl ?? AMY_MODEL_SRC;
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  // Signal readiness once — by the time this effect runs, useGLTF below has
  // already resolved (otherwise this component would still be suspended).
  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Speech Coach is always the primary, always-in-view content of its page —
  // no IntersectionObserver needed. Only pause for reduced-motion or an
  // actually backgrounded tab (battery), never on ambiguous visibility signals.
  const frameloop = !reduced && pageVisible ? "always" : "demand";

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0.15, 3.6], fov: 30 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-3, 1, 2]} intensity={1.4} color={rim} distance={12} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color="#EC4899" distance={12} />
        <AmyAvatar
          url={url}
          state={state}
          waitingForSession={waitingForSession}
          showHalo={showHalo}
          modelScale={modelScale}
        />
      </Canvas>
    </div>
  );
}
