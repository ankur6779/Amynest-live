// AmyPortrait — premium animated image avatar with a 4-state conversational
// "life" machine (idle / listening / thinking / speaking, plus celebrating /
// encouraging). All motion is transform + opacity only (60fps, mobile-safe):
//
//   • Pose layer (outer)  — head tilt + vertical offset, tweened smoothly on
//                            every state change (no hard jumps).
//   • Life layer  (inner) — looping breathing (scale) and, while speaking, a
//                            gentle talking nod.
//   • Eyelids             — random blink (rate varies by state).
//   • Mouth               — procedural 2D lip-sync: a viseme overlay hides the
//                            baked smile and morphs (AA/EE/IH/OH/OU) while
//                            speaking. No rigged model / audio access needed.
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

// Mouth center + base ellipse (fractions of size), measured/previewed on
// amy-avatar-square.png. The overlay hides the baked smile while speaking and
// morphs through visemes (procedural 2D lip-sync — no rigged model needed).
const MOUTH = { cx: 0.5, cy: 0.75, w: 0.09, h: 0.075 };

// Per-viseme [scaleX, scaleY] applied to the base mouth ellipse.
// 0=rest/closed, 1=AA, 2=EE, 3=IH, 4=OH, 5=OU.
const VISEME_SCALE: Record<number, [number, number]> = {
  0: [0.85, 0.06],
  1: [0.88, 1.0],
  2: [1.0, 0.18],
  3: [0.72, 0.42],
  4: [0.72, 0.92],
  5: [0.52, 0.55],
};
const SPEAKING_VISEMES = [1, 2, 3, 4, 5];

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

  // ── Procedural lip-sync: cycle visemes while speaking ───────────────────────
  // No audio access (engine-frozen) → drive mouth shapes on a natural rhythm
  // when `speaking`; snap closed otherwise. Swap to TTS viseme timing later.
  const [viseme, setViseme] = useState(0);
  useEffect(() => {
    if (reduced || !speaking) {
      setViseme(0);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      // ~15% brief close for natural pauses between syllables.
      const next =
        Math.random() < 0.15
          ? 0
          : SPEAKING_VISEMES[Math.floor(Math.random() * SPEAKING_VISEMES.length)];
      setViseme(next);
      timer = setTimeout(tick, 110 + Math.random() * 90);
    };
    tick();
    return () => clearTimeout(timer);
  }, [speaking, reduced]);

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

  // ── Pose layer: head tilt (roll) + 3D head turn (yaw → an ear comes forward) ─
  // roll = rotateZ; yawBase/yawSway = rotateY oscillation around a per-state
  // turn so a headphone ear drifts toward the viewer for a lively 3D feel.
  const pose = useMemo(() => {
    if (reduced) {
      // Flat: no tilt/turn; keep only the static positional cue for "thinking".
      return { roll: 0, yawBase: 0, yawSway: 0, yawDur: 0, y: state === "thinking" ? -size * 0.04 : 0 };
    }
    switch (state) {
      case "listening":
        return { roll: tiltDir * 7, yawBase: tiltDir * 13, yawSway: 3, yawDur: 4, y: 0 };
      case "thinking":
        return { roll: tiltDir * 5, yawBase: tiltDir * 10, yawSway: 3, yawDur: 4.5, y: -size * 0.05 };
      case "encouraging":
        return { roll: tiltDir * 5, yawBase: tiltDir * 10, yawSway: 3, yawDur: 4.5, y: 0 };
      case "speaking":
        return { roll: tiltDir * 2, yawBase: 0, yawSway: 6, yawDur: 3, y: 0 };
      case "celebrating":
        return { roll: 0, yawBase: 0, yawSway: 8, yawDur: 2.6, y: -size * 0.02 };
      default:
        // idle: gentle continuous turn so an ear keeps drifting to the front.
        return { roll: tiltDir * 2, yawBase: tiltDir * 4, yawSway: 5, yawDur: 5.5, y: 0 };
    }
  }, [state, reduced, size, tiltDir]);

  // ── Life layer: looping breathing (scale) + talking nod (y) ─────────────────
  // Scale baselines sit at ~1.05 (overfill) so the pose layer's 3D yaw never
  // exposes the circular mask edge.
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
            scale: [1.05, 1.068, 1.05],
            y: [0, -size * 0.02, size * 0.004, -size * 0.02, 0],
          },
          transition: {
            scale: { duration: 0.45, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "thinking":
        return {
          animate: { scale: [1.05, 1.065, 1.05], y: [0, -size * 0.012, 0] },
          transition: {
            scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "listening":
        return {
          animate: { scale: [1.05, 1.062, 1.05], y: 0 }, // calm + focused
          transition: {
            scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      case "celebrating":
        return {
          animate: { scale: [1.05, 1.08, 1.05], y: [0, -size * 0.02, 0] },
          transition: {
            scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
            y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
          },
        };
      default:
        // idle: gentle breathing.
        return {
          animate: { scale: [1.05, 1.07, 1.05], y: 0 },
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

      {/* Pose layer — head tilt (roll) + 3D head turn (yaw) under perspective. */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          overflow: "hidden",
          willChange: "transform",
          transformPerspective: size * 3,
          transformOrigin: "center 60%",
        }}
        animate={{
          rotateZ: pose.roll,
          rotateY: pose.yawSway
            ? [pose.yawBase - pose.yawSway, pose.yawBase + pose.yawSway, pose.yawBase - pose.yawSway]
            : pose.yawBase,
          y: pose.y,
        }}
        transition={{
          rotateZ: { duration: 0.6, ease: "easeInOut" },
          y: { duration: 0.6, ease: "easeInOut" },
          rotateY: pose.yawSway
            ? { duration: pose.yawDur, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.6, ease: "easeInOut" },
        }}
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

          {/* Procedural lip-sync mouth — hides the baked smile while speaking. */}
          {!reduced && (
            <div
              style={{
                position: "absolute",
                left: MOUTH.cx * size - (0.17 * size) / 2,
                top: MOUTH.cy * size - (0.12 * size) / 2,
                width: 0.17 * size,
                height: 0.12 * size,
                display: "grid",
                placeItems: "center",
                opacity: speaking ? 1 : 0,
                transition: "opacity 180ms ease",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              {/* Skin patch (radial, soft edges) covers the printed smile. */}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse at 50% 45%, #F2ECF9 0%, #ECE3F5 55%, rgba(236,227,245,0) 80%)",
                }}
              />
              {/* Mouth cavity — morphs between visemes via transform scale. */}
              <span
                style={{
                  position: "relative",
                  width: MOUTH.w * size,
                  height: MOUTH.h * size,
                  borderRadius: "50%",
                  background: "#7a3850",
                  overflow: "hidden",
                  boxShadow: "inset 0 2px 3px rgba(60,20,35,0.5)",
                  transformOrigin: "center",
                  transform: `scale(${VISEME_SCALE[viseme][0]}, ${VISEME_SCALE[viseme][1]})`,
                  transition: "transform 90ms ease",
                }}
              >
                {/* Lower-lip / tongue highlight. */}
                <span
                  style={{
                    position: "absolute",
                    left: "16%",
                    right: "16%",
                    bottom: "6%",
                    height: "46%",
                    borderRadius: "50%",
                    background: "#c46781",
                  }}
                />
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AmyPortrait;
