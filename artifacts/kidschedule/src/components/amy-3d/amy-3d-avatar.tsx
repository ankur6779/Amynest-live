// Amy3DAvatar — production Tripo GLB hero with 2D fallback.
// Presentation only: skeletal clips + optional mouth-frame overlay + waveform.

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { AmyStageAvatar } from "@/components/amy/amy-stage-avatar";
import { AmyStageWaveform } from "@/components/amy/amy-stage-waveform";
import { Amy3DMouthOverlay } from "@/components/amy-3d/amy-3d-mouth-overlay";
import { squareSizeToStageHeight } from "@/lib/amy/use-amy-stage-height";
import { AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import { canRenderLive3D } from "@/lib/amy-3d/webgl-support";
import { AMY_MODEL_SRC, useAmyModelAvailable } from "@/lib/amy-3d/baked-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { loadAmy3DStage } from "@/components/amy-3d/load-amy-3d-stage";
import type { Amy3DStageProps } from "@/components/amy-3d/amy-3d-stage";

const ENABLE_LIVE_3D = true;

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
    console.warn("[amy-3d] Amy3DAvatar failed, using 2D fallback", err);
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
}: Amy3DAvatarProps) {
  const modelAvailable = useAmyModelAvailable();
  const wantLive3D = ENABLE_LIVE_3D && modelAvailable && canRenderLive3D();
  const [Amy3DStage, setAmy3DStage] = useState<ComponentType<Amy3DStageProps> | null>(null);
  const [live3DFailed, setLive3DFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stageHeight = squareSizeToStageHeight(size);
  const stageWidth = Math.round(stageHeight * AMY_FULL_ASPECT);
  const isTalking = speaking || state === "speaking";

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

  const fallback = (
    <AmyStageAvatar
      state={state}
      height={stageHeight}
      speaking={isTalking}
      listening={listening || state === "listening"}
      listenForAudio={listenForAudio}
      audioLevelRef={audioLevelRef}
      audioMeterActiveRef={audioMeterActiveRef}
      debugMouth={debugMouth}
      showHalo={showHalo}
      showWaveform={showWaveform}
      className={className}
    />
  );

  if (!wantLive3D || !Amy3DStage || live3DFailed) {
    return fallback;
  }

  const LiveStage = Amy3DStage;
  const mouthActive = isTalking || listenForAudio;
  const stageLoading = (
    <div
      aria-hidden
      data-testid="amy-3d-stage-loading"
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );

  return (
    <Amy3DErrorBoundary fallback={fallback}>
      <div
        ref={containerRef}
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: Math.round(stageHeight * 0.06),
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
            flexShrink: 0,
          }}
        >
          <Suspense fallback={stageLoading}>
            <LiveStage
              state={state}
              size={size}
              modelUrl={modelUrl ?? AMY_MODEL_SRC}
              visibilityRoot={containerRef}
            />
          </Suspense>
          {mouthActive && (
            <Amy3DMouthOverlay
              width={size}
              height={size}
              speaking={isTalking}
              listenForAudio={listenForAudio}
              audioLevelRef={audioLevelRef}
              audioMeterActiveRef={audioMeterActiveRef}
            />
          )}
        </div>
        {showWaveform && (
          <AmyStageWaveform
            height={stageHeight}
            width={stageWidth}
            speaking={isTalking}
            listening={listening || state === "listening"}
            listenForAudio={listenForAudio}
            audioLevelRef={audioLevelRef}
            audioMeterActiveRef={audioMeterActiveRef}
          />
        )}
      </div>
    </Amy3DErrorBoundary>
  );
}

export default Amy3DAvatar;
