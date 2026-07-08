// Amy3DAvatar — single source of truth for rendering Amy.
// Presentation only: chooses ONE renderer (3D Tripo GLB or 2D image avatar),
// never both, and never renders a blank hero.
//
// State machine:
//   WebGL unsupported  → 2D forever, no 3D attempted.
//   WebGL supported     → attempt 3D. While loading OR on any failure, the
//                         Suspense/ErrorBoundary fallback IS the 2D avatar —
//                         so there is never an empty frame, ever.

import {
  Component,
  Suspense,
  lazy,
  type ReactNode,
  type RefObject,
} from "react";
import { AmyStageAvatar } from "@/components/amy/amy-stage-avatar";
import { AmyStageWaveform } from "@/components/amy/amy-stage-waveform";
import { squareSizeToStageHeight } from "@/lib/amy/use-amy-stage-height";
import { AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import { canRenderLive3D } from "@/lib/amy-3d/webgl-support";
import { AMY_MODEL_SRC } from "@/lib/amy-3d/baked-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

const Amy3DStage = lazy(() => import("@/components/amy-3d/amy-3d-stage"));

export interface Amy3DAvatarProps {
  state?: Amy3DState;
  size: number;
  speaking?: boolean;
  listening?: boolean;
  listenForAudio?: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
  debugMouth?: boolean;
  showWaveform?: boolean;
  showHalo?: boolean;
  className?: string;
  modelUrl?: string;
  /** Speech Coach before session start — wave greeting + warmup loop. */
  waitingForSession?: boolean;
  /** Extra in-canvas scale for hero framing (Speech Coach). */
  modelScale?: number;
  /** World-space vertical nudge to center the rig in the canvas. */
  verticalOffset?: number;
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
    console.warn("[amy-3d] 3D avatar failed, staying on 2D", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Amy3DAvatar({
  state = "idle",
  size,
  speaking = false,
  listening = false,
  listenForAudio = false,
  audioLevelRef,
  audioMeterActiveRef,
  debugMouth = false,
  showWaveform = false,
  showHalo = true,
  className,
  modelUrl,
  waitingForSession = false,
  modelScale = 1,
  verticalOffset = 0,
}: Amy3DAvatarProps) {
  const wantLive3D = canRenderLive3D();

  const stageHeight = squareSizeToStageHeight(size);
  const stageWidth = Math.round(stageHeight * AMY_FULL_ASPECT);
  const isTalking = speaking || state === "speaking";
  const isListening = listening || state === "listening";

  const twoDFallback = (
    <AmyStageAvatar
      state={state}
      height={stageHeight}
      speaking={isTalking}
      listening={isListening}
      listenForAudio={listenForAudio}
      audioLevelRef={audioLevelRef}
      audioMeterActiveRef={audioMeterActiveRef}
      debugMouth={debugMouth}
      showHalo={showHalo}
      showWaveform={false}
    />
  );

  const waveform = showWaveform && (
    <AmyStageWaveform
      height={stageHeight}
      width={stageWidth}
      speaking={isTalking}
      listening={isListening}
      listenForAudio={listenForAudio}
      audioLevelRef={audioLevelRef}
      audioMeterActiveRef={audioMeterActiveRef}
    />
  );

  const wrapperStyle = {
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: Math.round(stageHeight * 0.04),
    flexShrink: 0,
  };

  if (!wantLive3D) {
    return (
      <div className={className} style={wrapperStyle}>
        {twoDFallback}
        {waveform}
      </div>
    );
  }

  return (
    <div className={className} style={wrapperStyle}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <Amy3DErrorBoundary fallback={twoDFallback}>
          <Suspense fallback={twoDFallback}>
            <Amy3DStage
              state={state}
              size={size}
              modelUrl={modelUrl ?? AMY_MODEL_SRC}
              waitingForSession={waitingForSession}
              showHalo={showHalo}
              modelScale={modelScale}
              verticalOffset={verticalOffset}
            />
          </Suspense>
        </Amy3DErrorBoundary>
      </div>
      {waveform}
    </div>
  );
}

export default Amy3DAvatar;
