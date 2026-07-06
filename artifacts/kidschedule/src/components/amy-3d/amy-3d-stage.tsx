import { Suspense, useEffect, useMemo, useState, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { AMY_MODEL_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import { AmyAvatar } from "./avatar/AmyAvatar";
import { AmyCanvasVisibilityResume } from "./avatar/AmyCanvasVisibilityResume";

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
  /** Intersection root for offscreen frameloop suspend. */
  visibilityRoot?: RefObject<HTMLElement | null>;
  /** Speech Coach pre-session warmup loop. */
  waitingForSession?: boolean;
  showHalo?: boolean;
  modelScale?: number;
}

export default function Amy3DStage({
  state,
  size,
  modelUrl,
  className,
  visibilityRoot,
  waitingForSession,
  showHalo = true,
  modelScale = 1,
}: Amy3DStageProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rim = RIM_COLOR[state];
  const url = modelUrl ?? AMY_MODEL_SRC;
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    useGLTF.preload(url);
  }, [url]);

  useEffect(() => {
    const root = visibilityRoot?.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { root: null, threshold: 0.05 },
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [visibilityRoot]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const animate = !reduced && inView && pageVisible;
  const frameloop = animate ? "always" : "demand";

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0.15, 3.6], fov: 30 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <AmyCanvasVisibilityResume active={animate} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-3, 1, 2]} intensity={1.4} color={rim} distance={12} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color="#EC4899" distance={12} />
        <Suspense fallback={null}>
          <AmyAvatar
            url={url}
            state={state}
            waitingForSession={waitingForSession}
            showHalo={showHalo}
            modelScale={modelScale}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
