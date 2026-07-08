import { useEffect, useMemo, useRef } from "react";
import { subscribeAmyAnimationClock } from "@/lib/amy/character/amy-animation-clock";
import type { RefObject } from "react";

/**
 * Abstract neon voice waveform under the Amy hero.
 *
 * Canvas-drawn mirrored spectrum wave (not bars): layered sine fields shaped
 * by an edge-fading window, filled + stroked with a cyan→violet→magenta neon
 * gradient and a soft glow — styled after abstract audio-wave art. Animates
 * on the shared Amy animation clock; nothing triggers React re-renders.
 *
 * States:
 *  - speaking  → tall energetic wave following Amy's live output level
 *  - listening → calm cyan/teal breathing wave
 *  - armed     → gentle low shimmer (mic live, nobody talking)
 *  - idle      → near-flat glowing line
 */
const SAMPLES = 96;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const w = Math.max(260, Math.round(width * 0.96));
  const h = Math.max(72, Math.round(height * 0.3));

  // Backing store sized for the device pixel ratio so the glow stays crisp.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [w, h]);

  const palette = useMemo(
    () =>
      listening && !speaking
        ? { a: "#22d3ee", b: "#38bdf8", c: "#818cf8", glow: "rgba(34,211,238,0.85)" }
        : { a: "#67e8f9", b: "#a78bfa", c: "#e879f9", glow: "rgba(167,139,250,0.85)" },
    [listening, speaking],
  );

  useEffect(() => {
    const top = new Float32Array(SAMPLES);

    return subscribeAmyAnimationClock((nowMs) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const t = nowMs / 1000;
      const live = clamp01(audioLevelRef?.current ?? 0);
      const meterLive = audioMeterActiveRef?.current === true;
      const amyTalking = meterLive && live > 0.07;

      const drive = amyTalking
        ? Math.max(live, 0.55)
        : speaking
          ? // Meter not wired (fallback / QA): keep the wave alive mid-speech.
            0.5 + 0.26 * Math.sin(t * 3.4)
          : listening
            ? 0.4 + 0.16 * Math.sin(t * 2.0)
            : listenForAudio
              ? 0.24
              : 0.13;
      const speed = amyTalking || speaking ? 1.9 : listening ? 1.1 : 0.55;

      const midY = h / 2;
      const maxAmp = midY * 0.96;

      for (let i = 0; i < SAMPLES; i++) {
        const x = i / (SAMPLES - 1);
        // Edge-fading window so the wave melts into the background.
        const win = Math.pow(Math.sin(Math.PI * x), 0.85);
        // Layered traveling sines → organic "spectrum" silhouette.
        const f =
          0.5 * Math.sin(x * 8.5 * Math.PI + t * 4.2 * speed) +
          0.3 * Math.sin(x * 4.2 * Math.PI - t * 2.6 * speed + 1.7) +
          0.2 * Math.sin(x * 15 * Math.PI + t * 6.4 * speed + 0.6);
        top[i] = clamp01(0.12 + Math.abs(f)) * win * drive * maxAmp;
      }

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, palette.a);
      grad.addColorStop(0.5, palette.b);
      grad.addColorStop(1, palette.c);

      const step = w / (SAMPLES - 1);

      const traceMirrored = () => {
        ctx.beginPath();
        ctx.moveTo(0, midY - top[0]);
        for (let i = 1; i < SAMPLES; i++) ctx.lineTo(i * step, midY - top[i]);
        for (let i = SAMPLES - 1; i >= 0; i--) ctx.lineTo(i * step, midY + top[i]);
        ctx.closePath();
      };

      // 1. Wide soft glow pass.
      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 28;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = grad;
      traceMirrored();
      ctx.fill();
      ctx.restore();

      // 2. Main translucent body.
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = grad;
      traceMirrored();
      ctx.fill();
      ctx.restore();

      // 3. Bright neon rim on both silhouettes.
      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(0, midY - top[0]);
      for (let i = 1; i < SAMPLES; i++) ctx.lineTo(i * step, midY - top[i]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, midY + top[0]);
      for (let i = 1; i < SAMPLES; i++) ctx.lineTo(i * step, midY + top[i]);
      ctx.stroke();
      ctx.restore();

      // 4. Hot white core line through the middle.
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      for (let i = 1; i < SAMPLES; i++) {
        const wobble = Math.sin(i * 0.35 + t * 3 * speed) * Math.min(2.5, top[i] * 0.12);
        ctx.lineTo(i * step, midY + wobble);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [audioLevelRef, audioMeterActiveRef, listenForAudio, listening, speaking, palette, w, h]);

  const active = listenForAudio || speaking || listening;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        width: w,
        height: h,
        display: "block",
        opacity: active ? 1 : 0.75,
        transition: "opacity 260ms ease",
        pointerEvents: "none",
      }}
    />
  );
}
