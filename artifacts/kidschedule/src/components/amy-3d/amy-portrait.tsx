// AmyPortrait — premium animated image avatar.
//
// This is the hero avatar shown until a rigged 3D model (public/amy-3d/amy.glb)
// is added. It renders the high-quality Amy render with idle breathing, a gentle
// float, subtle head tilt, and a soft purple neon halo pulse — so Amy feels
// alive and premium without a live WebGL canvas. When `state === "speaking"` the
// halo + scale pulse speeds up to read as "talking".
//
// True per-eye blink and viseme lip-sync are intentionally NOT faked here (they
// cannot be aligned reliably on a baked image) — those arrive with the rigged
// 3D model via AmyGltf in amy-3d-stage.tsx.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AMY_PORTRAIT_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export interface AmyPortraitProps {
  state?: Amy3DState;
  size: number;
  className?: string;
}

export function AmyPortrait({ state = "idle", size, className }: AmyPortraitProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const speaking = state === "speaking";
  const listening = state === "listening";
  const celebrating = state === "celebrating";

  // Per-state halo glow colour (mirrors the 3D rim-light tokens).
  const glow = celebrating
    ? "rgba(251,191,36,0.65)"
    : listening
      ? "rgba(34,211,238,0.6)"
      : speaking
        ? "rgba(168,85,247,0.7)"
        : "rgba(139,92,246,0.55)";

  const breatheDuration = speaking ? 0.45 : celebrating ? 0.6 : 3.6;
  const haloDuration = speaking ? 0.9 : 2.8;

  // Even under prefers-reduced-motion we keep a very gentle, slow life so the
  // companion never looks like a frozen sticker — just calmer & smaller.
  const floatY = reduced ? size * 0.012 : size * 0.035;
  const tiltDeg = reduced ? 1.2 : celebrating ? 4 : 3;
  const breatheScale = reduced ? 1.008 : celebrating ? 1.03 : 1.02;
  const floatDur = reduced ? 6 : 3.6;
  const tiltDur = reduced ? 9 : celebrating ? 0.8 : 5;
  const haloDur = reduced ? 5 : haloDuration;

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

      {/* Amy render — float + breathing + head tilt */}
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
      </motion.div>
    </div>
  );
}

export default AmyPortrait;
