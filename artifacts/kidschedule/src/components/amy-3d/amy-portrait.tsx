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

  const breatheDuration = speaking ? 0.45 : celebrating ? 0.6 : 4.2;
  const haloDuration = speaking ? 0.9 : 3.2;

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
          boxShadow: `0 0 ${size * 0.18}px ${glow}, 0 0 ${size * 0.34}px ${glow}`,
        }}
        animate={reduced ? undefined : { opacity: [0.55, 0.95, 0.55], scale: [1, 1.04, 1] }}
        transition={
          reduced
            ? undefined
            : { duration: haloDuration, repeat: Infinity, ease: "easeInOut" }
        }
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
        animate={
          reduced
            ? undefined
            : {
                y: [0, -size * 0.02, 0],
                rotate: celebrating ? [-4, 4, -4] : [-3, 3, -3],
                scale: [1, 1.01, 1],
              }
        }
        transition={
          reduced
            ? undefined
            : {
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                rotate: {
                  duration: celebrating ? 0.8 : 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                scale: { duration: breatheDuration, repeat: Infinity, ease: "easeInOut" },
              }
        }
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
