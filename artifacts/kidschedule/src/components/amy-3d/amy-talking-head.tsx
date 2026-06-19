// AmyTalkingHead — audio-driven mouth frames + ambient speaking cues.
//
// Mouth: three pre-rendered frames (closed / small-open / wide-open). Frame
// selection is driven by Amy's OUTPUT audio amplitude (Web Audio analyser),
// not by response.start/end timers. Falls back to CSS cross-fade loop only when
// the analyser is unavailable.

import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AMY_TALK_FRAMES } from "@/lib/amy-3d/baked-avatar";
import {
  AMY_MOUTH_FRAME_MS,
  audioLevelToVolumePercent,
  mouthFrameToOpacities,
  resolveMouthFrameFromVolume,
  type AmyMouthFrame,
} from "@/lib/amy-3d/amy-mouth-audio";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

interface AmyTalkingHeadProps {
  /** Pixel size of the square avatar. */
  size: number;
  /** Fallback timer mouth when audio meter is unavailable. */
  speaking?: boolean;
  /** When true, run the audio mouth loop (session live). */
  listenForAudio?: boolean;
  /** Amy is listening to the child — cyan glow + attentive head tilt. */
  listening?: boolean;
  /** Live 0..1 amplitude of Amy's voice output. */
  audioLevelRef?: RefObject<number>;
  /** Set true once the Web Audio analyser has produced samples. */
  audioMeterActiveRef?: RefObject<boolean>;
  /** Show live volume + frame overlay (?speechDebug=1). */
  debugMouth?: boolean;
  /** Soft neon halo ring + voice cues. Defaults to true. */
  halo?: boolean;
  /** `circle` = avatar crop; `stage` = full render, no circular frame (more 3D). */
  presentation?: "circle" | "stage";
  className?: string;
}

const BAR_COUNT = 9;

function ringTransform(isStage: boolean, scale: number): string {
  const s = scale.toFixed(3);
  return isStage
    ? `translate(-50%, -50%) scale(${s})`
    : `scale(${s})`;
}

function stageWaveHeight(
  barDrive: number,
  center: number,
  wob: number,
  isStage: boolean,
): number {
  const floor = isStage ? 0.34 : 0.14;
  const ceiling = 1;
  const amp = isStage ? 0.88 : 0.5;
  return Math.max(floor, Math.min(ceiling, floor + barDrive * (0.45 + 0.55 * center) * wob * amp));
}

export function AmyTalkingHead({
  size,
  speaking = false,
  listenForAudio = false,
  listening = false,
  audioLevelRef,
  audioMeterActiveRef,
  debugMouth = false,
  halo = true,
  presentation = "circle",
  className,
}: AmyTalkingHeadProps) {
  const isStage = presentation === "stage";
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    if (!listenForAudio && !speaking && !listening) return;
    if (typeof document === "undefined") return;
    const onVis = () => setTabHidden(document.visibilityState === "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [listenForAudio, speaking, listening]);

  const [timerFallback, setTimerFallback] = useState(false);

  useEffect(() => {
    if (!speaking || !listenForAudio || reduced) {
      setTimerFallback(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      if (audioMeterActiveRef?.current !== true) {
        setTimerFallback(true);
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [speaking, listenForAudio, reduced, audioMeterActiveRef]);

  const useTimerFallback = timerFallback && speaking && !tabHidden && !reduced;

  const ringRef = useRef<HTMLSpanElement | null>(null);
  const hpLeftRef = useRef<HTMLSpanElement | null>(null);
  const hpRightRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mouthF1Ref = useRef<HTMLImageElement | null>(null);
  const mouthF2Ref = useRef<HTMLImageElement | null>(null);
  const stageTiltRef = useRef<HTMLDivElement | null>(null);

  const mouthStateRef = useRef<{ lastSpeechAtMs: number; frame: AmyMouthFrame }>({
    lastSpeechAtMs: 0,
    frame: 0,
  });
  const [debugOverlay, setDebugOverlay] = useState({
    volume: 0,
    frame: 0 as AmyMouthFrame,
    meterActive: false,
  });

  useEffect(() => {
    const ring = ringRef.current;
    const hpL = hpLeftRef.current;
    const hpR = hpRightRef.current;
    const bars = barRefs.current;
    const f1 = mouthF1Ref.current;
    const f2 = mouthF2Ref.current;
    const stageTilt = stageTiltRef.current;

    const resetMouthClosed = () => {
      if (f1) f1.style.opacity = "0";
      if (f2) f2.style.opacity = "0";
    };

    if (tabHidden || reduced) {
      if (ring) {
        ring.style.opacity = halo ? "0.5" : "0";
        ring.style.transform = ringTransform(isStage, 1);
      }
      if (hpL) hpL.style.opacity = "0";
      if (hpR) hpR.style.opacity = "0";
      bars.forEach((b) => b && (b.style.transform = "scaleY(0.16)"));
      resetMouthClosed();
      return;
    }

    if (!listenForAudio && !speaking && !listening) {
      resetMouthClosed();
      if (ring) {
        ring.style.opacity = halo ? "0.5" : "0";
        ring.style.transform = ringTransform(isStage, 1);
      }
      if (hpL) hpL.style.opacity = "0";
      if (hpR) hpR.style.opacity = "0";
      bars.forEach((b) => b && (b.style.transform = "scaleY(0.16)"));
      return;
    }

    let raf = 0;
    let lastMouthTick = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const live = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
      const volume = audioLevelToVolumePercent(live);
      const meterLive = audioMeterActiveRef?.current === true;

      if (meterLive && listenForAudio && now - lastMouthTick >= AMY_MOUTH_FRAME_MS) {
        lastMouthTick = now;
        if (f1?.classList.contains("amy-talk-f1")) {
          f1.classList.remove("amy-talk-f1");
          f2?.classList.remove("amy-talk-f2");
        }
        const resolved = resolveMouthFrameFromVolume(volume, now, mouthStateRef.current);
        mouthStateRef.current = resolved;
        const opacities = mouthFrameToOpacities(resolved.frame);
        if (f1) f1.style.opacity = String(opacities.f1Opacity);
        if (f2) f2.style.opacity = String(opacities.f2Opacity);
        if (debugMouth) {
          setDebugOverlay({
            volume,
            frame: resolved.frame,
            meterActive: meterLive,
          });
        }
      } else if (!meterLive && !speaking) {
        resetMouthClosed();
        mouthStateRef.current = { lastSpeechAtMs: 0, frame: 0 };
      }

      const t = (now - start) / 1000;
      const drive = meterLive ? live : 0;
      const amyTalking = meterLive && drive > 0.07;
      const listenIdleWave = 0.52 + 0.48 * (0.5 + 0.5 * Math.sin(t * 4.2));
      const barDrive = amyTalking
        ? Math.max(drive, 0.35)
        : listening
          ? listenIdleWave
          : useTimerFallback
            ? 0.32
            : listenForAudio
              ? 0.22
              : 0;

      if (ring) {
        const ringDrive = amyTalking
          ? drive
          : listening
            ? 0.45 + 0.15 * Math.sin(t * 3.5)
            : useTimerFallback
              ? 0.35
              : 0.18;
        const ringOpacity = isStage
          ? 0.55 + 0.4 * ringDrive
          : 0.42 + 0.5 * ringDrive;
        ring.style.opacity = String(halo ? ringOpacity : 0);
        ring.style.transform = ringTransform(isStage, 1 + (isStage ? 0.1 : 0.05) * ringDrive);
        if (isStage) {
          const cyan = listening && !amyTalking;
          const glowA = cyan ? "rgba(34,211,238,0.65)" : "rgba(168,85,247,0.62)";
          const glowB = cyan ? "rgba(56,189,248,0.38)" : "rgba(236,72,153,0.32)";
          ring.style.boxShadow =
            `0 0 ${Math.round(size * 0.32)}px ${glowA}, `
            + `0 0 ${Math.round(size * 0.62)}px ${glowB}, `
            + `0 0 ${Math.round(size * 0.9)}px rgba(99,102,241,0.18)`;
        }
      }
      if (isStage && stageTilt && !reduced) {
        let yaw: number;
        let roll: number;
        if (amyTalking || speaking) {
          yaw = Math.sin(t * 1.1) * 9;
          roll = Math.sin(t * 0.85) * 2.5;
        } else if (listening) {
          yaw = -12 + Math.sin(t * 1.4) * 4;
          roll = -6 + Math.sin(t * 1.8) * 1.5;
        } else if (listenForAudio) {
          yaw = Math.sin(t * 0.7) * 5;
          roll = Math.sin(t * 0.9) * 2;
        } else {
          yaw = Math.sin(t * 0.5) * 3;
          roll = 0;
        }
        stageTilt.style.transform =
          `perspective(${size * 3.2}px) rotateY(${yaw.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg)`;
      } else if (stageTilt) {
        stageTilt.style.transform = "";
      }
      const glowBase = amyTalking ? drive : listening ? 0.55 : useTimerFallback ? 0.35 : 0.15;
      const glow = 0.25 + 0.85 * glowBase;
      if (hpL) {
        const hpMul = listening && !amyTalking ? 1.15 : 1;
        hpL.style.opacity = String(glow * hpMul * (0.75 + 0.25 * Math.sin(t * 7)));
      }
      if (hpR) {
        const hpMul = listening && !amyTalking ? 1.15 : 1;
        hpR.style.opacity = String(glow * hpMul * (0.75 + 0.25 * Math.sin(t * 7 + 1.7)));
      }

      const n = bars.length;
      for (let i = 0; i < n; i++) {
        const b = bars[i];
        if (!b) continue;
        const center = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
        const wob = 0.55 + 0.45 * Math.sin(t * (listening ? 7.5 : 9) + i * 1.15);
        const h = stageWaveHeight(barDrive, center, wob, isStage);
        b.style.transform = `scaleY(${h})`;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    listenForAudio,
    speaking,
    tabHidden,
    reduced,
    audioLevelRef,
    audioMeterActiveRef,
    debugMouth,
    halo,
    useTimerFallback,
    isStage,
    size,
    listening,
  ]);

  const layer: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: isStage ? "contain" : "cover",
    display: "block",
    pointerEvents: "none",
  };

  const earcup: CSSProperties = {
    position: "absolute",
    top: "64%",
    width: "30%",
    height: "30%",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(56,189,248,0.85) 0%, rgba(56,189,248,0.35) 38%, rgba(56,189,248,0) 70%)",
    filter: "blur(4px)",
    opacity: 0,
    pointerEvents: "none",
    mixBlendMode: "screen",
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(size * (isStage ? 0.06 : 0.05)),
        flexShrink: 0,
      }}
      aria-hidden
    >
      <div
        style={{
          width: size,
          height: isStage ? Math.round(size * 1.02) : size,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {isStage && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              bottom: Math.round(size * 0.02),
              width: Math.round(size * 0.52),
              height: Math.round(size * 0.07),
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 72%)",
              filter: "blur(10px)",
              pointerEvents: "none",
            }}
          />
        )}

        {halo && (
          <span
            ref={ringRef}
            style={{
              position: "absolute",
              ...(isStage
                ? {
                    left: "50%",
                    top: "48%",
                    width: Math.round(size * 0.74),
                    height: Math.round(size * 0.74),
                    transform: "translate(-50%, -50%)",
                  }
                : { inset: -4 }),
              borderRadius: "50%",
              background: "transparent",
              boxShadow: isStage
                ? `0 0 ${Math.round(size * 0.32)}px rgba(168,85,247,0.62), 0 0 ${Math.round(size * 0.62)}px rgba(56,189,248,0.35), 0 0 ${Math.round(size * 0.9)}px rgba(99,102,241,0.2)`
                : "0 0 0 3px rgba(168,85,247,0.5), 0 0 30px 6px rgba(168,85,247,0.55)",
              opacity: isStage ? 0.55 : 0.5,
              pointerEvents: "none",
              willChange: "opacity, transform",
            }}
          />
        )}

        <span ref={hpLeftRef} style={{ ...earcup, left: "8%" }} />
        <span ref={hpRightRef} style={{ ...earcup, left: "92%" }} />

        <div
          ref={stageTiltRef}
          style={{
            position: "absolute",
            inset: 0,
            ...(isStage
              ? { overflow: "visible", transformOrigin: "center 58%" }
              : { borderRadius: "50%", overflow: "hidden" }),
          }}
        >
          <img src={AMY_TALK_FRAMES[0]} alt="" draggable={false} style={layer} />
          <img
            ref={mouthF1Ref}
            src={AMY_TALK_FRAMES[1]}
            alt=""
            draggable={false}
            className={useTimerFallback ? "amy-talk-f1" : undefined}
            style={{
              ...layer,
              ...(useTimerFallback ? {} : { opacity: 0, willChange: "opacity" }),
            }}
          />
          <img
            ref={mouthF2Ref}
            src={AMY_TALK_FRAMES[2]}
            alt=""
            draggable={false}
            className={useTimerFallback ? "amy-talk-f2" : undefined}
            style={{
              ...layer,
              ...(useTimerFallback ? {} : { opacity: 0, willChange: "opacity" }),
            }}
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

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: Math.max(isStage ? 6 : 3, Math.round(size * (isStage ? 0.028 : 0.018))),
          height: Math.round(size * (isStage ? 0.28 : 0.12)),
          minWidth: isStage ? Math.round(size * 0.78) : undefined,
          opacity: listenForAudio || speaking ? 1 : 0.65,
          transition: "opacity 240ms ease",
        }}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            style={{
              width: Math.max(isStage ? 7 : 3, Math.round(size * (isStage ? 0.028 : 0.016))),
              height: "100%",
              borderRadius: 999,
              transformOrigin: "center bottom",
              transform: `scaleY(${isStage ? 0.26 : 0.16})`,
              background: listening && !speaking
                ? "linear-gradient(180deg, #67e8f9 0%, #38bdf8 45%, #a855f7 100%)"
                : "linear-gradient(180deg, #7dd3fc 0%, #c084fc 55%, #a855f7 100%)",
              boxShadow: isStage
                ? "0 0 18px rgba(125,211,252,0.9), 0 0 28px rgba(168,85,247,0.55), 0 0 36px rgba(56,189,248,0.35)"
                : "0 0 8px rgba(125,211,252,0.55)",
              willChange: "transform",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default AmyTalkingHead;
