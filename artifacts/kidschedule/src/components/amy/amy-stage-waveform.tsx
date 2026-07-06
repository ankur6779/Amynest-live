import { useEffect, useRef } from "react";
import { AMY_WAVEFORM_BAR_COUNT } from "@/lib/amy/character/amy-character-constants";
import { subscribeAmyAnimationClock } from "@/lib/amy/character/amy-animation-clock";
import { stageWaveHeight } from "@/lib/amy/character/amy-character-motion";
import type { RefObject } from "react";

export function AmyStageWaveform({
  height,
  width,
  speaking,
  listening,
  listenForAudio,
  audioLevelRef,
  audioMeterActiveRef,
}: {
  height: number;
  width: number;
  speaking: boolean;
  listening: boolean;
  listenForAudio: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
}) {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    return subscribeAmyAnimationClock((nowMs) => {
      const t = nowMs / 1000;
      const live = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
      const meterLive = audioMeterActiveRef?.current === true;
      const amyTalking = meterLive && live > 0.07;
      const listenIdleWave = 0.52 + 0.48 * (0.5 + 0.5 * Math.sin(t * 4.2));
      const barDrive = amyTalking
        ? Math.max(live, 0.35)
        : listening
          ? listenIdleWave
          : listenForAudio
            ? 0.22
            : 0;

      for (let i = 0; i < barRefs.current.length; i++) {
        const b = barRefs.current[i];
        if (!b) continue;
        const center = 1 - Math.abs(i - (barRefs.current.length - 1) / 2) / ((barRefs.current.length - 1) / 2);
        const wob = 0.55 + 0.45 * Math.sin(t * (listening ? 7.5 : 9) + i * 1.15);
        b.style.transform = `scaleY(${stageWaveHeight(barDrive, center, wob).toFixed(3)})`;
      }
    });
  }, [audioLevelRef, audioMeterActiveRef, listenForAudio, listening]);

  return (
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
            barRefs.current[i] = el;
          }}
          style={{
            width: Math.max(7, Math.round(height * 0.028)),
            height: "100%",
            borderRadius: 999,
            transformOrigin: "center bottom",
            transform: "scaleY(0.26)",
            background:
              listening && !speaking
                ? "linear-gradient(180deg, #67e8f9 0%, #38bdf8 45%, #a855f7 100%)"
                : "linear-gradient(180deg, #7dd3fc 0%, #c084fc 55%, #a855f7 100%)",
            boxShadow:
              "0 0 18px rgba(125,211,252,0.9), 0 0 28px rgba(168,85,247,0.55), 0 0 36px rgba(56,189,248,0.35)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
