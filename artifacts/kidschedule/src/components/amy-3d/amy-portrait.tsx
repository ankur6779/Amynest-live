// AmyPortrait — premium animated image avatar.
//
// Renders the high-quality Amy render with idle breathing, a gentle float,
// subtle head tilt, and a soft purple neon halo pulse — so Amy feels alive and
// premium without a live WebGL canvas. When `state === "speaking"` she does a
// gentle "talking" nod and the halo/breath speed up.
//
// 2D blink approximation: soft eyelid overlays positioned over Amy's eyes blink
// every 3–5s. This is a baked-image approximation — crisp per-viseme lip-sync
// and per-eye blink come with an animatable renderer (rigged 3D glb / Rive).

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AMY_PORTRAIT_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export interface AmyPortraitProps {
  state?: Amy3DState;
  size: number;
  className?: string;
}

// Eye positions as fractions of the square portrait. Measured from
// amy-avatar-square.png (eye centers ~y 0.625, x 0.365 / 0.635) and verified
// with an overlay preview so the blink lids sit exactly on Amy's eyes.
const EYE = { y: 0.625, h: 0.145, w: 0.165, lX: 0.365, rX: 0.635 };

export function AmyPortrait({ state = "idle", size, className }: AmyPortraitProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const speaking = state === "speaking";
  const listening = state === "listening";
  const celebrating = state === "celebrating";

  // ── Blink scheduler (random 3–5s, ~110ms close, occasional double) ──────────
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let doubleTimer: ReturnType<typeof setTimeout>;
    const run = () => {
      setBlinking(true);
      openTimer = setTimeout(() => setBlinking(false), 110);
      if (Math.random() < 0.25) {
        doubleTimer = setTimeout(() => {
          setBlinking(true);
          setTimeout(() => setBlinking(false), 95);
        }, 230);
      }
      timer = setTimeout(run, 3000 + Math.random() * 2000);
    };
    timer = setTimeout(run, 1200 + Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(openTimer);
      clearTimeout(doubleTimer);
    };
  }, [reduced]);

  // Per-state halo glow colour (mirrors the 3D rim-light tokens).
  const glow = celebrating
    ? "rgba(251,191,36,0.65)"
    : listening
      ? "rgba(34,211,238,0.6)"
      : speaking
        ? "rgba(168,85,247,0.7)"
        : "rgba(139,92,246,0.55)";

  const breatheDuration = speaking ? 0.42 : celebrating ? 0.6 : 3.6;
  const haloDuration = speaking ? 0.9 : 2.8;

  // Even under prefers-reduced-motion we keep a very gentle, slow life so the
  // companion never looks like a frozen sticker — just calmer & smaller.
  const floatY = reduced ? size * 0.012 : speaking ? size * 0.022 : size * 0.035;
  const tiltDeg = reduced ? 1.2 : celebrating ? 4 : 3;
  const breatheScale = reduced ? 1.008 : speaking ? 1.018 : celebrating ? 1.03 : 1.02;
  const floatDur = reduced ? 6 : speaking ? 0.9 : 3.6;
  const tiltDur = reduced ? 9 : celebrating ? 0.8 : 5;
  const haloDur = reduced ? 5 : haloDuration;

  // Eyelid geometry (px).
  const lidW = EYE.w * size;
  const lidH = EYE.h * size;
  const lidTop = (EYE.y - EYE.h / 2) * size;
  const lidStyle = (cx: number): CSSProperties => ({
    position: "absolute",
    left: cx * size - lidW / 2,
    top: lidTop,
    width: lidW,
    height: lidH,
    borderRadius: "18% 18% 48% 48% / 22% 22% 80% 80%",
    background: "linear-gradient(180deg,#F1ECF9 0%,#E7DEF3 60%,#D8C9EA 100%)",
    boxShadow: "inset 0 -1px 2px rgba(120,90,160,0.35)",
    transformOrigin: "center top",
    transform: `scaleY(${blinking ? 1 : 0})`,
    transition: "transform 80ms ease-in-out",
    pointerEvents: "none",
    zIndex: 2,
  });

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      aria-hidden
    >
      {/* Soft purple neon halo */}
      <motion.span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          pointerEvents: "none",
          boxShadow: `0 0 ${size * 0.18}px ${glow}, 0 0 ${size * 0.36}px ${glow}`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: haloDur, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Amy render — float + breathing + head tilt (+ talking nod) + blink */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          overflow: "hidden",
          willChange: "transform",
        }}
        animate={{
          y: [0, -floatY, 0],
          rotate: [-tiltDeg, tiltDeg, -tiltDeg],
          scale: [1, breatheScale, 1],
        }}
        transition={{
          y: { duration: floatDur, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: tiltDur, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: breatheDuration, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <img
          src={AMY_PORTRAIT_SRC}
          alt="Amy"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 42%",
            display: "block",
          }}
        />
        {/* Soft eyelid overlays for a 2D blink. */}
        {!reduced && <span style={lidStyle(EYE.lX)} />}
        {!reduced && <span style={lidStyle(EYE.rX)} />}
      </motion.div>
    </div>
  );
}

export default AmyPortrait;
