// useBlink — natural eyelid blinking + cheek / smile coupling.
//
//   • 3–6s random (state-tuned)
//   • 120–180ms eased lids
//   • occasional double-blink
//   • during blink: tiny cheek lift + smile boost (Pixar soft squash)
//
// Writes pose.face.blink / cheekLift / smileBoost; FaceDriver applied in compose.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { FaceDriver } from "./face-driver";
import type { AmyExpressionPreset } from "./expression-presets";
import type { AmyPose } from "./pose";

export interface BlinkOptions {
  reduced?: boolean;
  expression?: AmyExpressionPreset;
  pose?: AmyPose;
  minInterval?: number;
  maxInterval?: number;
  minDuration?: number;
  maxDuration?: number;
  doubleBlinkChance?: number;
}

type Phase = "wait" | "blinking";

interface BlinkRuntime {
  phase: Phase;
  next: number;
  start: number;
  duration: number;
  pendingDouble: boolean;
}

function lidCurve(p: number): number {
  const x = p < 0 ? 0 : p > 1 ? 1 : p;
  return Math.sin(Math.PI * x) ** 0.85;
}

export function useBlink(
  face: FaceDriver | null,
  options: BlinkOptions = {},
): void {
  const {
    reduced = false,
    expression,
    pose,
    minInterval = expression?.blinkMin ?? 3,
    maxInterval = expression?.blinkMax ?? 6,
    minDuration = expression?.blinkDurMin ?? 0.12,
    maxDuration = expression?.blinkDurMax ?? 0.18,
    doubleBlinkChance = expression?.doubleBlinkChance ?? 0.22,
  } = options;

  const exprRef = useRef(expression);
  exprRef.current = expression;
  const poseRef = useRef(pose);
  poseRef.current = pose;

  // Independent start delay so blink never syncs with breath/eyes on mount.
  const rt = useRef<BlinkRuntime>({
    phase: "wait",
    next: 1.4 + Math.random() * 2.8,
    start: 0,
    duration: 0.14,
    pendingDouble: false,
  });

  useFrame((ctx) => {
    if (reduced || !face || !face.hasBlink) return;
    const t = ctx.clock.elapsedTime;
    const r = rt.current;
    const ex = exprRef.current;
    const faceLife = poseRef.current?.face;
    const iMin = ex?.blinkMin ?? minInterval;
    const iMax = ex?.blinkMax ?? maxInterval;
    const dMin = ex?.blinkDurMin ?? minDuration;
    const dMax = ex?.blinkDurMax ?? maxDuration;
    const dbl = ex?.doubleBlinkChance ?? doubleBlinkChance;

    if (r.phase === "wait") {
      if (faceLife) {
        faceLife.blink = 0;
        faceLife.cheekLift *= 0.85;
      }
      if (t >= r.next) {
        r.phase = "blinking";
        r.start = t;
        r.duration = dMin + Math.random() * (dMax - dMin);
        if (!r.pendingDouble) {
          r.pendingDouble = Math.random() < dbl;
        }
      }
      return;
    }

    const p = (t - r.start) / r.duration;
    if (p >= 1) {
      face.setBlink(0);
      if (faceLife) {
        faceLife.blink = 0;
        faceLife.cheekLift = 0;
      }
      if (r.pendingDouble) {
        r.pendingDouble = false;
        r.phase = "blinking";
        r.start = t;
        r.duration = (dMin + Math.random() * (dMax - dMin)) * 0.85;
      } else {
        r.phase = "wait";
        r.next = t + iMin + Math.random() * (iMax - iMin);
      }
      return;
    }

    const lid = lidCurve(p);
    face.setBlink(lid);
    if (faceLife) {
      faceLife.blink = lid;
      // Cheek lift peaks mid-blink; tiny smile increase — very subtle.
      faceLife.cheekLift = lid * 0.55;
      faceLife.smileBoost = Math.max(faceLife.smileBoost, lid * 0.045);
    }
  });
}
