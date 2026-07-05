// AmyAvatar — tier-aware entry point for rendering Amy.
//
//   tier="hero"  → live 3D Amy (Tripo rig + clips) when WebGL + amy.glb available,
//                  else AmyStageAvatar (2D full-body fallback).
//   tier="icon"  → lightweight AmyIcon. Never mounts WebGL.

import { Component, Suspense, useEffect, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { AmyStageAvatar } from "@/components/amy/amy-stage-avatar";
import { AmyIcon } from "@/components/amy-icon";
import { squareSizeToStageHeight } from "@/lib/amy/use-amy-stage-height";
import { canRenderLive3D } from "@/lib/amy-3d/webgl-support";
import { AMY_MODEL_SRC, useAmyModelAvailable } from "@/lib/amy-3d/baked-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { loadAmy3DStage } from "@/components/amy-3d/load-amy-3d-stage";
import type { Amy3DStageProps } from "@/components/amy-3d/amy-3d-stage";

const ENABLE_LIVE_3D = true;

export interface AmyAvatarProps {
  state?: Amy3DState;
  size: number;
  tier?: "hero" | "icon";
  modelUrl?: string;
  ring?: boolean;
  bounce?: boolean;
  className?: string;
  audioLevelRef?: RefObject<number>;
  speaking?: boolean;
}

class Amy3DErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[amy-3d] live stage failed, using 2D fallback", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AmyAvatar({
  state = "idle",
  size,
  tier = "icon",
  modelUrl,
  ring = false,
  bounce = false,
  className,
  audioLevelRef,
  speaking = false,
}: AmyAvatarProps) {
  const modelAvailable = useAmyModelAvailable();
  const wantLive3D = ENABLE_LIVE_3D && modelAvailable && canRenderLive3D();
  const [Amy3DStage, setAmy3DStage] = useState<ComponentType<Amy3DStageProps> | null>(
    null,
  );
  const [live3DFailed, setLive3DFailed] = useState(false);

  useEffect(() => {
    if (!wantLive3D) {
      setAmy3DStage(null);
      setLive3DFailed(false);
      return;
    }
    let cancelled = false;
    void loadAmy3DStage().then((Stage) => {
      if (cancelled) return;
      if (Stage) setAmy3DStage(() => Stage);
      else setLive3DFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [wantLive3D]);

  const iconFallback = (
    <AmyIcon size={size} ring={ring} bounce={bounce} className={className} speaking={speaking} />
  );

  if (tier !== "hero") {
    return iconFallback;
  }

  const stage = (
    <AmyStageAvatar
      state={state}
      height={squareSizeToStageHeight(size)}
      speaking={speaking || state === "speaking"}
      listening={state === "listening"}
      listenForAudio={speaking || state === "speaking"}
      audioLevelRef={audioLevelRef}
      className={className}
      showWaveform={false}
    />
  );

  if (wantLive3D && Amy3DStage && !live3DFailed) {
    const LiveStage = Amy3DStage;
    return (
      <Amy3DErrorBoundary fallback={stage}>
        <Suspense fallback={stage}>
          <LiveStage
            state={state}
            size={size}
            modelUrl={modelUrl ?? AMY_MODEL_SRC}
            className={className}
          />
        </Suspense>
      </Amy3DErrorBoundary>
    );
  }

  return stage;
}

export default AmyAvatar;
