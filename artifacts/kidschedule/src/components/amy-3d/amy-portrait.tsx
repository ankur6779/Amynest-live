// AmyPortrait — premium animated image avatar with a 4-state conversational
// "life" machine (idle / listening / thinking / speaking, plus celebrating /
// encouraging). All motion is transform + opacity only (60fps, mobile-safe):
//
//   • Pose layer (outer)  — head tilt + vertical offset, tweened smoothly on
//                            every state change (no hard jumps).
//   • Life layer  (inner) — looping breathing (scale) and, while speaking, a
//                            gentle talking nod.
//   • Eyelids             — random blink (rate varies by state).
//   • Halo                — one rAF loop drives scale + opacity; on LISTENING it
//                            reacts to live mic volume (haloScale = 1 + lvl*0.05).
//
// prefers-reduced-motion → tilt, pulses, nod and blink are all disabled; only a
// soft static state-coloured halo remains as a visibility cue.

import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { AMY_PORTRAIT_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export interface AmyPortraitProps {
  state?: Amy3DState;
  size: number;
  className?: string;
  /**
   * Optional live mic level (0..1) as a ref — read inside the halo rAF so a
   * LISTENING Amy reacts to the child's voice without triggering re-renders.
   */
  audioLevelRef?: RefObject<number>;
}

// Eye positions as fractions of the square portrait. Measured from
// amy-avatar-square.png (eye centers ~y 0.625, x 0.365 / 0.635) and verified
// with an overlay preview so the blink lids sit exactly on Amy's eyes.
const EYE = { y: 0.625, h: 0.145, w: 0.165, lX: 0.365, rX: 0.635 };

// Per-state halo glow colour (mirrors the 3D rim-light tokens).
function haloGlow(state: Amy3DState): string {
  switch (state) {
    case "listening":
      return "rgba(34,211,238,0.60)";
    case "thinking":
      return "rgba(251,191,36,0.55)";
    case "speaking":
      return "rgba(168,85,247,0.70)";
    case "celebrating":
      return "rgba(251,191,36,0.70)";
    case "encouraging":
      return "rgba(244,114,182,0.60)";
    default:
      return "rgba(139,92,246,0.55)";
  }
}

// Halo pulse shape: base scale, amplitude, period (seconds).
function haloPulse(state: Amy3DState): { base: number; amp: number; period: number } {
  switch (state) {
    case "listening":
      return { base: 1, amp: 0.012, period: 3.2 }; // gentle; overridden by mic level
    case "thinking":
      return { base: 1, amp: 0.04, period: 3.0 }; // slow 1.00 → 1.04
    case "speaking":
      return { base: 1, amp: 0.05, period: 0.9 }; // fast "talking" pulse
    case "celebrating":
      return { base: 1, amp: 0.05, period: 0.7 };
    case "encouraging":
      return { base: 1, amp: 0.03, period: 1.6 };
    default:
      return { base: 1, amp: 0.02, period: 4.0 }; // idle 1.00 → 1.02
  }
}

// Random blink scheduling window (ms) + double-blink chance, per state.
function blinkTiming(state: Amy3DState): { min: number; max: number; doubleChance: number } {
  switch (state) {
    case "listening":
      return { min: 5000, max: 9000, doubleChance: 0.1 }; // focused → blink less
    case "speaking":
      return { min: 3000, max: 5000, doubleChance: 0.2 };
    case "celebrating":
    case "encouraging":
      return { min: 2500, max: 5000, doubleChance: 0.3 };
    default:
      return { min: 3000, max: 7000, doubleChance: 0.25 }; // idle / thinking
  }
}

export function AmyPortrait({
  state = "idle",
  size,
  className,
  audioLevelRef,
}: AmyPortraitProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const speaking = state === "speaking";

  // Random tilt direction, re-rolled whenever Amy enters a "posed" state.
  const [tiltDir, setTiltDir] = useState(1);
  useEffect(() => {
    if (state === "listening" || state === "thinking" || state === "encouraging") {
      setTiltDir(Math.random() < 0.5 ? -1 : 1);
    }
  }, [state]);

  // ── Blink scheduler (rate varies by state; off under reduced motion) ────────
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (reduced) {
      setBlinking(false);
      return;
    }
    const { min, max, doubleChance } = blinkTiming(state);
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let doubleTimer: ReturnType<typeof setTimeout>;
    let doubleOpenTimer: ReturnType<typeof setTimeout>;
    const run = () => {
      setBlinking(true);
      openTimer = setTimeout(() => setBlinking(false), 110);
      if (Math.random() < doubleChance) {
        doubleTimer = setTimeout(() => {
          setBlinking(true);
          doubleOpenTimer = setTimeout(() => setBlinking(false), 95);
        }, 230);
      }
      timer = setTimeout(run, min + Math.random() * (max - min));
    };
    timer = setTimeout(run, 1000 + Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(openTimer);
      clearTimeout(doubleTimer);
      clearTimeout(doubleOpenTimer);
    };
  }, [reduced, state]);

  // ── Halo: single rAF loop → transform (scale) + opacity only ────────────────
  const haloRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = haloRef.current;
    if (!el) return;
    if (reduced || typeof requestAnimationFrame === "undefined") {
      el.style.transform = "scale(1)";
      el.style.opacity = "0.6";
      return;
    }
    const { base, amp, period } = haloPulse(state);
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const phase = Math.sin((t / period) * Math.PI * 2) * 0.5 + 0.5; // 0..1
      let scale = base + phase * amp;
      let opacity = 0.5 + phase * 0.42;
      if (state === "listening") {
        const lvl = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
        const micScale = 1 + lvl * 0.05; // spec: clamp growth
        scale = Math.max(micScale, base + phase * amp);
        opacity = Math.min(0.97, 0.55 + lvl * 0.4 + phase * 0.05);
      }
      el.style.transform = `scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, reduced, audioLevelRef]);

  // ── Pose layer: smooth tween to per-state head tilt + vertical offset ───────
  const pose = useMemo(() => {
    if (reduced) {
      // No tilt; keep only the static positional cue for "thinking" (look up).
      return { rotate: 0, y: state === "thinking" ? -size * 0.04 : 0 };
    }
    switch (state) {
      case "listening":
        return { rotate: tiltDir * 4, y: 0 };
      case "thinking":
        return { rotate: tiltDir * 2, y: -size * 0.05 }; // slight upward gaze
      case "encouraging":
        return { rotate: tiltDir * 2, y: 0 };
      case "celebrating":
        return { rotate: 0, y: -size * 0.02 };
      default:
        return { rotate: 0, y: 0 }; // idle / speaking → centred
    }
  }, [state, reduced, size, tiltDir]);

  // ── Life layer: looping breathing (scale) + talking nod (y) ─────────────────
  const life = useMemo(() => {
    if (reduced) {
      return {
        animate: { scale: 1, y: 0 },
        transition: { duration: 0 },
      };
    }
    switch (state) {
      case "speaking":
        return {
          animate: {
            scale: [1, 1.018, 1],
            y: [0, -size * 0.02, size * 0.004, -size * 0.02, 0],
          },
          transition: {
            scale: { duration: 0.45, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "thinking":
        return {
          animate: { scale: [1, 1.015, 1], y: [0, -size * 0.012, 0] },
          transition: {
            scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "listening":
        return {
          animate: { scale: [1, 1.012, 1], y: 0 }, // mouth/posture calm + focused
          transition: {
            scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "celebrating":
        return {
          animate: { scale: [1, 1.03, 1], y: [0, -size * 0.02, 0] },
          transition: {
            scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      default:
        // idle: gentle breathing only, no head/positional motion.
        return {
          animate: { scale: [1, 1.02, 1], y: 0 },
          transition: {
            scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
    }
  }, [state, reduced, size]);

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

  const glow = haloGlow(state);

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      aria-hidden
    >
      {/* Soft state-coloured halo — scale/opacity driven imperatively (rAF). */}
      <span
        ref={haloRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          pointerEvents: "none",
          transformOrigin: "center",
          willChange: "transform, opacity",
          transition: "box-shadow 400ms ease",
          boxShadow: `0 0 ${size * 0.18}px ${glow}, 0 0 ${size * 0.36}px ${glow}`,
        }}
      />

      {/* Pose layer — smooth tween to per-state tilt + offset. */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          overflow: "hidden",
          willChange: "transform",
        }}
        animate={pose}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        {/* Life layer — looping breathing + talking nod. */}
        <motion.div
          style={{ width: "100%", height: "100%", willChange: "transform" }}
          animate={life.animate}
          transition={life.transition}
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
      </motion.div>
    </div>
  );
}

export default AmyPortrait;
