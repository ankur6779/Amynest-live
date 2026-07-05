// AmyStageAvatar — full-body Amy shell powered by AmyCharacterEngine.

import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AmyCharacterBody } from "@/components/amy/amy-character-body";
import { AmyHalo } from "@/components/amy/amy-halo";
import { AmyParticles } from "@/components/amy/amy-particles";
import { AmyShadow } from "@/components/amy/amy-shadow";
import { AMY_FULL_ASPECT, AMY_STAGE_ASSETS } from "@/lib/amy/amy-stage-assets";
import { AMY_ERROR_RECOVERY_MS, AMY_WAVEFORM_BAR_COUNT } from "@/lib/amy/character/amy-character-constants";
import {
  amy3dToCharacterState,
  characterStateToAssetKey,
  stageToCharacterState,
  type AmyCharacterState,
} from "@/lib/amy/character/amy-character-state";
import { useAmyCharacterEngine } from "@/lib/amy/character/use-amy-character-engine";
import { useAmyBlink } from "@/lib/amy/character/use-amy-blink";
import {
  amy3dToStageState,
  type AmyStageState,
} from "@/lib/amy/amy-stage-state";
import { useAmyStageHeight } from "@/lib/amy/use-amy-stage-height";
import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

function isAmy3DState(v: string): v is Amy3DState {
  return (
    v === "idle" ||
    v === "listening" ||
    v === "thinking" ||
    v === "speaking" ||
    v === "celebrating" ||
    v === "encouraging"
  );
}

function resolveCharacterState(
  stateProp: AmyStageState | Amy3DState | AmyCharacterState,
  speaking: boolean,
): AmyCharacterState {
  if (
    stateProp === "idle" ||
    stateProp === "listening" ||
    stateProp === "thinking" ||
    stateProp === "talking" ||
    stateProp === "celebrating" ||
    stateProp === "happy" ||
    stateProp === "waiting" ||
    stateProp === "sleeping" ||
    stateProp === "error"
  ) {
    if (stateProp === "talking" || (speaking && stateProp === "idle")) return "talking";
    return stateProp;
  }
  if (isAmy3DState(stateProp)) {
    return amy3dToCharacterState(stateProp, { speaking });
  }
  const stage = stateProp as AmyStageState;
  if (speaking) return "talking";
  return stageToCharacterState(stage);
}

export interface AmyStageAvatarProps {
  state?: AmyStageState | Amy3DState | AmyCharacterState;
  height?: number;
  speaking?: boolean;
  listenForAudio?: boolean;
  listening?: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
  debugMouth?: boolean;
  showWaveform?: boolean;
  showShadow?: boolean;
  showHalo?: boolean;
  className?: string;
  alt?: string;
}

function AmyStageAvatarInner({
  state: stateProp = "idle",
  height: heightProp,
  speaking = false,
  listenForAudio = false,
  listening = false,
  audioLevelRef,
  audioMeterActiveRef,
  debugMouth = false,
  showWaveform = false,
  showShadow = true,
  showHalo = true,
  className,
  alt = "Amy, your AI speech coach",
}: AmyStageAvatarProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const height = useAmyStageHeight(heightProp);
  const width = Math.round(height * AMY_FULL_ASPECT);

  const characterState = resolveCharacterState(stateProp, speaking);
  const [visualState, setVisualState] = useState(characterState);

  useEffect(() => {
    setVisualState(characterState);
    if (characterState !== "error") return;
    const timer = window.setTimeout(
      () => setVisualState("idle"),
      AMY_ERROR_RECOVERY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [characterState]);

  const motionState = visualState;
  const isListening = listening || motionState === "listening";
  const isTalking = speaking || motionState === "talking";
  const isCelebrating = motionState === "celebrating" || motionState === "happy";
  const isSleeping = motionState === "sleeping";
  const useMouthLayers = isTalking || speaking;
  const staticSrc = AMY_STAGE_ASSETS[characterStateToAssetKey(motionState)];

  const [tabHidden, setTabHidden] = useState(false);
  const [audioTimerFallback, setAudioTimerFallback] = useState(false);
  const [mouthFrame, setMouthFrame] = useState<AmyMouthFrame>(0);
  const [debugOverlay, setDebugOverlay] = useState({
    volume: 0,
    frame: 0 as AmyMouthFrame,
    meterActive: false,
  });
  const [celebrateBurst, setCelebrateBurst] = useState(false);

  const onMouthFrameChange = useCallback((frame: AmyMouthFrame) => {
    setMouthFrame(frame);
  }, []);

  const onDebugMouth = useCallback(
    (v: { volume: number; frame: AmyMouthFrame; meterActive: boolean }) => {
      setDebugOverlay(v);
    },
    [],
  );

  useEffect(() => {
    if (!isCelebrating || reduced) {
      setCelebrateBurst(false);
      return;
    }
    setCelebrateBurst(true);
    const t = window.setTimeout(() => setCelebrateBurst(false), 2600);
    return () => window.clearTimeout(t);
  }, [isCelebrating, reduced]);

  const useTimerFallback =
    speaking && !tabHidden && !reduced && (!listenForAudio || audioTimerFallback);

  const engineRefs = useAmyCharacterEngine({
    characterState: motionState,
    height,
    width,
    reduced,
    tabHidden,
    speaking,
    listenForAudio,
    isListening,
    isTalking,
    useMouthLayers,
    useTimerFallback,
    showHalo,
    showShadow,
    showWaveform,
    audioLevelRef,
    audioMeterActiveRef,
    debugMouth,
    onDebugMouth: debugMouth ? onDebugMouth : undefined,
    onMouthFrameChange,
  });

  const blinking = useAmyBlink(
    motionState,
    reduced || isSleeping,
    isTalking,
    engineRefs.mouthFrameRef,
  );

  useEffect(() => {
    if (!listenForAudio && !speaking && !isListening) return;
    if (typeof document === "undefined") return;
    const onVis = () => setTabHidden(document.visibilityState === "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [listenForAudio, speaking, isListening]);

  useEffect(() => {
    if (!speaking || !listenForAudio || reduced) {
      setAudioTimerFallback(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      if (audioMeterActiveRef?.current !== true) setAudioTimerFallback(true);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [speaking, listenForAudio, reduced, audioMeterActiveRef]);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(height * 0.06),
        flexShrink: 0,
      }}
    >
      <div
        ref={engineRefs.containerRef}
        style={{
          width,
          height,
          position: "relative",
          flexShrink: 0,
          overflow: "visible",
        }}
      >
        <AmyShadow ref={engineRefs.shadowRef} width={width} height={height} visible={showShadow} />
        <AmyHalo ref={engineRefs.haloRef} width={width} height={height} visible={showHalo} />

        {isListening && (
          <span
            ref={engineRefs.listenGlowRef}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "32%",
              width: Math.round(width * 0.78),
              height: Math.round(height * 0.14),
              transform: "translate(-50%, -50%)",
              borderRadius: "9999px",
              background:
                "radial-gradient(ellipse, rgba(34,211,238,0.5) 0%, rgba(56,189,248,0.14) 55%, transparent 72%)",
              pointerEvents: "none",
              willChange: "opacity",
            }}
          />
        )}

        <AmyParticles
          kind="celebration"
          width={width}
          height={height}
          active={celebrateBurst}
          reduced={reduced}
        />

        {isSleeping && !reduced && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: "58%",
              top: "18%",
              fontSize: Math.round(height * 0.045),
              color: "rgba(196,181,253,0.75)",
              animation: "amySleepZ 3.2s ease-in-out infinite",
            }}
          >
            z
          </span>
        )}

        <div
          ref={engineRefs.bodyWrapRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "center 58%",
            perspective: height * 3.2,
            willChange: "transform",
          }}
        >
          <AmyCharacterBody
            width={width}
            height={height}
            alt={alt}
            staticSrc={staticSrc}
            talking={useMouthLayers}
            mouthFrame={mouthFrame}
            blinking={blinking}
            eyesClosed={isSleeping}
            pupilLeftRef={engineRefs.pupilLeftRef}
            pupilRightRef={engineRefs.pupilRightRef}
            bodyImgRef={engineRefs.bodyImgRef}
            reduced={reduced}
          />
        </div>

        {debugMouth && (
          <div
            style={{
              position: "absolute",
              left: 8,
              bottom: 8,
              borderRadius: 8,
              background: "rgba(0,0,0,0.65)",
              padding: "4px 8px",
              fontSize: 11,
              fontFamily: "monospace",
              lineHeight: 1.4,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            vol {debugOverlay.volume}
            <br />
            frame {debugOverlay.frame}
            <br />
            meter {debugOverlay.meterActive ? "on" : "off"}
          </div>
        )}
      </div>

      {showWaveform && (
        <div
          aria-hidden
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.max(6, Math.round(height * 0.028)),
            height: Math.round(height * 0.28),
            minWidth: Math.round(width * 0.88),
            opacity: listenForAudio || speaking ? 1 : 0.65,
            transition: "opacity 220ms ease",
          }}
        >
          {Array.from({ length: AMY_WAVEFORM_BAR_COUNT }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                engineRefs.barRefs.current[i] = el;
              }}
              style={{
                width: Math.max(7, Math.round(height * 0.028)),
                height: "100%",
                borderRadius: 999,
                transformOrigin: "center bottom",
                transform: "scaleY(0.26)",
                background: isListening && !speaking
                  ? "linear-gradient(180deg, #67e8f9 0%, #38bdf8 45%, #a855f7 100%)"
                  : "linear-gradient(180deg, #7dd3fc 0%, #c084fc 55%, #a855f7 100%)",
                boxShadow:
                  "0 0 18px rgba(125,211,252,0.9), 0 0 28px rgba(168,85,247,0.55), 0 0 36px rgba(56,189,248,0.35)",
                willChange: "transform",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const AmyStageAvatar = memo(AmyStageAvatarInner);
export default AmyStageAvatar;
export { amy3dToStageState };
