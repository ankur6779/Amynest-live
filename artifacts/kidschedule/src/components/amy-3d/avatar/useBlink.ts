// useBlink — natural eyelid blinking.
//
//   • fires every 3–5s at random
//   • each blink lasts 100–150ms with smooth (eased) eyelid travel
//   • ~25% of the time it's a double-blink (a quick second blink right after)
//
// Drives the blink channel through the MorphTargetManager. If the rig has no
// eyelid blend shapes (e.g. a raw Tripo head) this is a harmless no-op — the
// manager's setBlink simply has nothing to write to.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MorphTargetManager } from "./visemes";

export interface BlinkOptions {
  reduced?: boolean;
  minInterval?: number; // seconds
  maxInterval?: number; // seconds
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
  doubleBlinkChance?: number; // 0..1
}

type Phase = "wait" | "blinking";

interface BlinkRuntime {
  phase: Phase;
  next: number; // wall-clock time of next blink
  start: number; // start time of current blink
  duration: number; // current blink duration
  pendingDouble: boolean;
}

/**
 * Eased 0→1→0 lid curve. A raised-sine gives a soft close and a snappy-but-
 * smooth re-open, which looks far more lifelike than a linear triangle.
 */
function lidCurve(p: number): number {
  const x = p < 0 ? 0 : p > 1 ? 1 : p;
  // sin(pi*x) peaks at x=0.5; square it slightly for a crisper close.
  return Math.sin(Math.PI * x) ** 0.85;
}

export function useBlink(
  manager: MorphTargetManager | null,
  options: BlinkOptions = {},
): void {
  const {
    reduced = false,
    minInterval = 3,
    maxInterval = 5,
    minDuration = 0.1,
    maxDuration = 0.15,
    doubleBlinkChance = 0.25,
  } = options;

  const rt = useRef<BlinkRuntime>({
    phase: "wait",
    next: 1 + Math.random() * 2,
    start: 0,
    duration: 0.12,
    pendingDouble: false,
  });

  useFrame((ctx) => {
    if (reduced || !manager) return;
    const t = ctx.clock.elapsedTime;
    const r = rt.current;

    if (r.phase === "wait") {
      if (t >= r.next) {
        r.phase = "blinking";
        r.start = t;
        r.duration = minDuration + Math.random() * (maxDuration - minDuration);
        if (!r.pendingDouble) {
          r.pendingDouble = Math.random() < doubleBlinkChance;
        }
      }
      return;
    }

    // phase === "blinking"
    const p = (t - r.start) / r.duration;
    if (p >= 1) {
      manager.setBlink(0);
      if (r.pendingDouble) {
        // Immediate, slightly shorter second blink.
        r.pendingDouble = false;
        r.phase = "blinking";
        r.start = t;
        r.duration = (minDuration + Math.random() * (maxDuration - minDuration)) * 0.85;
      } else {
        r.phase = "wait";
        r.next = t + minInterval + Math.random() * (maxInterval - minInterval);
      }
      return;
    }
    manager.setBlink(lidCurve(p));
  });
}
