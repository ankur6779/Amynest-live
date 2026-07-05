import { type RefObject, useEffect, useRef } from "react";
import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import { subscribeAmyAnimationClock } from "./amy-animation-clock";
import {
  AMY_HEAD_SETTLE_MS,
  AMY_STATE_TRANSITION_MS,
} from "./amy-character-constants";
import {
  lerpPresetToward,
  motionPresetForState,
  type AmyMotionPreset,
} from "./amy-character-presets";
import type { AmyCharacterState } from "./amy-character-state";
import { haloColors, haloMotion } from "./amy-halo-config";
import {
  computeAmyPupilOffset,
  pointerToPupilTarget,
  type AmyEyePointerTarget,
  type AmyPupilOffset,
} from "./amy-eye-tracking";
import {
  floatPhase,
  resolveAmyMouthFrame,
  stageWaveHeight,
  volumeFromLevel,
} from "./amy-character-motion";

export interface AmyCharacterEngineInput {
  characterState: AmyCharacterState;
  height: number;
  width: number;
  reduced: boolean;
  tabHidden: boolean;
  speaking: boolean;
  listenForAudio: boolean;
  isListening: boolean;
  isTalking: boolean;
  useMouthLayers: boolean;
  useTimerFallback: boolean;
  showHalo: boolean;
  showShadow: boolean;
  showWaveform: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
  debugMouth?: boolean;
  onDebugMouth?: (v: { volume: number; frame: AmyMouthFrame; meterActive: boolean }) => void;
  onMouthFrameChange?: (frame: AmyMouthFrame) => void;
}

export interface AmyCharacterEngineRefs {
  containerRef: RefObject<HTMLDivElement | null>;
  bodyWrapRef: RefObject<HTMLDivElement | null>;
  bodyImgRef: RefObject<HTMLImageElement | null>;
  haloRef: RefObject<HTMLSpanElement | null>;
  shadowRef: RefObject<HTMLSpanElement | null>;
  listenGlowRef: RefObject<HTMLSpanElement | null>;
  pupilLeftRef: RefObject<HTMLSpanElement | null>;
  pupilRightRef: RefObject<HTMLSpanElement | null>;
  barRefs: RefObject<(HTMLSpanElement | null)[]>;
  mouthFrameRef: RefObject<AmyMouthFrame>;
}

/**
 * AmyCharacterEngine — shared-clock rAF for mouth frames, blended motion,
 * halo, shadow, pupils, listening glow and waveform bars.
 */
export function useAmyCharacterEngine(
  input: AmyCharacterEngineInput,
): AmyCharacterEngineRefs {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bodyWrapRef = useRef<HTMLDivElement | null>(null);
  const bodyImgRef = useRef<HTMLImageElement | null>(null);
  const haloRef = useRef<HTMLSpanElement | null>(null);
  const shadowRef = useRef<HTMLSpanElement | null>(null);
  const listenGlowRef = useRef<HTMLSpanElement | null>(null);
  const pupilLeftRef = useRef<HTMLSpanElement | null>(null);
  const pupilRightRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mouthFrameRef = useRef<AmyMouthFrame>(0);
  const mouthStateRef = useRef({ lastSpeechAtMs: 0, frame: 0 as AmyMouthFrame });
  const pupilOffsetRef = useRef<AmyPupilOffset>({ x: 0, y: 0 });
  const pointerTargetRef = useRef<AmyEyePointerTarget>({ x: 0, y: 0 });
  const isCoarseRef = useRef(false);
  const inputRef = useRef(input);
  inputRef.current = input;

  const motionRef = useRef<AmyMotionPreset>(motionPresetForState("idle"));
  const settleRef = useRef(0);
  const errorShakeRef = useRef(0);
  const prevStateRef = useRef<AmyCharacterState>("idle");
  const clockStartRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    isCoarseRef.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  useEffect(() => {
    if (input.reduced) return;
    const onMove = (e: PointerEvent) => {
      if (isCoarseRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      pointerTargetRef.current = pointerToPupilTarget(e.clientX, e.clientY, el);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [input.reduced]);

  useEffect(() => {
    const tick = (nowMs: number, dtSec: number) => {
      if (!clockStartRef.current) clockStartRef.current = nowMs;
      const t = (nowMs - clockStartRef.current) / 1000;

      const {
        characterState,
        height,
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
        onDebugMouth,
        onMouthFrameChange,
      } = inputRef.current;

      if (characterState !== prevStateRef.current) {
        settleRef.current = 1;
        if (characterState === "error") errorShakeRef.current = 1;
        prevStateRef.current = characterState;
      }

      if (settleRef.current > 0) {
        settleRef.current = Math.max(0, settleRef.current - dtSec / (AMY_HEAD_SETTLE_MS / 1000));
      }
      if (errorShakeRef.current > 0) {
        errorShakeRef.current = Math.max(0, errorShakeRef.current - dtSec / 0.42);
      }

      if (reduced || tabHidden) {
        mouthFrameRef.current = 0;
        return;
      }

      const live = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
      const volume = volumeFromLevel(live);
      const meterLive = audioMeterActiveRef?.current === true;
      const speechEmphasis = meterLive && live > 0.12 ? live : 0;

      if (useMouthLayers) {
        const resolved = resolveAmyMouthFrame({
          nowMs: nowMs,
          volume,
          meterLive,
          listenForAudio,
          speaking,
          useTimerFallback,
          mouthState: mouthStateRef.current,
        });
        mouthStateRef.current = resolved;
        if (resolved.frame !== mouthFrameRef.current) {
          mouthFrameRef.current = resolved.frame;
          onMouthFrameChange?.(resolved.frame);
        }
        if (debugMouth && onDebugMouth) {
          onDebugMouth({ volume, frame: resolved.frame, meterActive: meterLive });
        }
      } else if (!speaking && !isTalking) {
        if (mouthFrameRef.current !== 0) {
          mouthFrameRef.current = 0;
          onMouthFrameChange?.(0);
        }
        mouthStateRef.current = { lastSpeechAtMs: 0, frame: 0 };
      }

      const targetMotion = motionPresetForState(characterState);
      motionRef.current = lerpPresetToward(
        motionRef.current,
        targetMotion,
        dtSec,
        AMY_STATE_TRANSITION_MS,
      );
      const m = motionRef.current;

      const floatAmp =
        m.floatAmp * height * (1 + speechEmphasis * 0.35);
      const floatY = Math.sin((t / m.floatPeriod) * Math.PI * 2) * floatAmp;
      const breath =
        1 + Math.sin((t / (m.floatPeriod * 0.85)) * Math.PI * 2) * m.breathAmp;
      const sway =
        Math.sin((t / (m.floatPeriod * 1.35)) * Math.PI * 2) * m.swayAmp;
      const settleNudge = settleRef.current * Math.sin(settleRef.current * Math.PI) * 0.6;
      const shake =
        errorShakeRef.current > 0
          ? Math.sin(t * 48) * errorShakeRef.current * 0.75
          : 0;

      if (bodyWrapRef.current) {
        bodyWrapRef.current.style.transform =
          `translateY(${floatY.toFixed(2)}px) `
          + `rotateZ(${(m.rotateZ + sway + settleNudge + shake).toFixed(2)}deg) `
          + `rotateY(${m.rotateY.toFixed(2)}deg) `
          + `scale(${breath.toFixed(4)})`;
      }

      const motion = haloMotion(characterState);
      const colors = haloColors(characterState);
      const phase = floatPhase(t, motion.period);
      const floatPh = floatPhase(t, m.floatPeriod);
      const haloMul = m.haloIntensity * (1 + speechEmphasis * 0.22);

      if (showShadow && shadowRef.current) {
        const spread = 1 + floatPh * 0.1 * (1 + speechEmphasis * 0.15);
        shadowRef.current.style.transform =
          `translateX(-50%) scale(${spread.toFixed(3)}, ${(0.85 + floatPh * 0.06).toFixed(3)})`;
        shadowRef.current.style.opacity = (0.36 + floatPh * 0.12).toFixed(3);
      }

      if (showHalo && haloRef.current) {
        const amyTalking = meterLive && live > 0.07;
        let scale = (motion.base + phase * motion.amp) * haloMul;
        let opacity = (motion.opacityBase + phase * motion.opacityAmp) * Math.min(1.15, haloMul);
        const ringDrive = amyTalking
          ? live
          : isListening
            ? 0.48 + 0.14 * Math.sin(t * 3.4)
            : useTimerFallback
              ? 0.34
              : 0.2;
        if (isListening) {
          const lvl = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
          scale = Math.max(1 + lvl * 0.04, scale);
          opacity = Math.min(0.97, opacity + 0.12 + lvl * 0.32);
        } else if (characterState === "talking" || amyTalking) {
          scale += ringDrive * 0.06;
          opacity += ringDrive * 0.38;
        } else {
          scale += ringDrive * 0.04;
          opacity += ringDrive * 0.28;
        }
        haloRef.current.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
        haloRef.current.style.opacity = Math.min(1, opacity).toFixed(3);
        haloRef.current.style.background =
          `radial-gradient(circle, ${colors.inner} 0%, ${colors.outer} 55%, transparent 72%)`;
      }

      if (listenGlowRef.current) {
        const amyTalking = meterLive && live > 0.07;
        const bright = m.listenRingBright;
        listenGlowRef.current.style.opacity =
          isListening && !amyTalking
            ? String(0.38 + bright * 0.42 + 0.2 * Math.sin(t * 3.6))
            : "0";
      }

      pupilOffsetRef.current = computeAmyPupilOffset(
        t,
        containerRef.current,
        pointerTargetRef.current,
        pupilOffsetRef.current,
        isCoarseRef.current,
      );
      const po = pupilOffsetRef.current;
      const eyeBright = m.eyeBrightness * (1 + speechEmphasis * 0.12);
      const pupilY = po.y + m.pupilBiasY;
      const pupilTransform =
        `translate(${po.x.toFixed(2)}px, ${pupilY.toFixed(2)}px)`;
      if (pupilLeftRef.current) {
        pupilLeftRef.current.style.transform = pupilTransform;
        pupilLeftRef.current.style.opacity = Math.min(1.15, eyeBright).toFixed(3);
      }
      if (pupilRightRef.current) {
        pupilRightRef.current.style.transform = pupilTransform;
        pupilRightRef.current.style.opacity = Math.min(1.15, eyeBright).toFixed(3);
      }

      if (showWaveform) {
        const amyTalking = meterLive && live > 0.07;
        const listenIdleWave = 0.52 + 0.48 * (0.5 + 0.5 * Math.sin(t * 4.2));
        const barDrive = amyTalking
          ? Math.max(live, 0.35)
          : isListening
            ? listenIdleWave
            : useTimerFallback
              ? 0.32
              : listenForAudio
                ? 0.22
                : 0;
        const bars = barRefs.current;
        for (let i = 0; i < bars.length; i++) {
          const b = bars[i];
          if (!b) continue;
          const center = 1 - Math.abs(i - (bars.length - 1) / 2) / ((bars.length - 1) / 2);
          const wob = 0.55 + 0.45 * Math.sin(t * (isListening ? 7.5 : 9) + i * 1.15);
          b.style.transform = `scaleY(${stageWaveHeight(barDrive, center, wob).toFixed(3)})`;
        }
      }
    };

    return subscribeAmyAnimationClock(tick);
  }, []);

  return {
    containerRef,
    bodyWrapRef,
    bodyImgRef,
    haloRef,
    shadowRef,
    listenGlowRef,
    pupilLeftRef,
    pupilRightRef,
    barRefs,
    mouthFrameRef,
  };
}
