// useEyeMovement — organic gaze + speech / thinking eye life.
//
// Eye contact most of the time; occasional glance away <300ms then return.
// Thinking: ONE intentional cycle per thinking entry —
//   look up → soft blink → tiny smile → look back to child.
// Speaking: eyes brighten + tiny squash from speech energy.

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AmyPose } from "./pose";
import type { AmyExpressionPreset } from "./expression-presets";
import type { FaceDriver } from "./face-driver";
import { createOrganicPhases, organic } from "./organic-noise";

export interface EyeMovementOptions {
  reduced?: boolean;
  amplitude?: number;
  attentive?: boolean;
  skeletalDamp?: number;
  expression?: AmyExpressionPreset;
  /** True while Amy3DState === "thinking" — gates once-per-cycle glance. */
  thinkingActive?: boolean;
  face?: FaceDriver | null;
  speechEnergyRef?: { current: number };
  /** Request a blink from the blink scheduler (thinking / listening). */
  requestBlinkRef?: { current: boolean };
}

const DEG = Math.PI / 180;

function isFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(hover: none)").matches
  );
}

type GlancePhase = "idle" | "up" | "blink" | "smile" | "return" | "done";
type AwayPhase = "contact" | "away" | "returning";

export function useEyeMovement(
  pose: AmyPose,
  options: EyeMovementOptions = {},
): void {
  const {
    reduced = false,
    amplitude = 2.5 * DEG,
    attentive = false,
    skeletalDamp = 1,
    expression,
    thinkingActive = false,
    face = null,
    speechEnergyRef,
    requestBlinkRef,
  } = options;
  const fine = useMemo(() => isFinePointer(), []);
  const { pointer } = useThree();

  const exprRef = useRef(expression);
  exprRef.current = expression;
  const faceRef = useRef(face);
  faceRef.current = face;
  const attentiveRef = useRef(attentive);
  attentiveRef.current = attentive;
  const thinkingRef = useRef(thinkingActive);
  thinkingRef.current = thinkingActive;

  const phases = useRef(createOrganicPhases());
  const state = useRef({
    targetYaw: 0,
    targetPitch: 0,
    curYaw: 0,
    curPitch: 0,
    nextSaccade: 1.2 + Math.random() * 2.4,
    // Thinking — once per entry.
    glance: "idle" as GlancePhase,
    glanceT: 0,
    thinkingWasActive: false,
    // Brief glance-away (<300ms) then return to child.
    away: "contact" as AwayPhase,
    awayT: 0,
    nextAway: 4 + Math.random() * 5,
    awayYaw: 0,
    awayPitch: 0,
  });

  useFrame((ctx) => {
    const g = pose.gaze;
    const faceLife = pose.face;
    if (reduced) {
      g.headYaw = g.headPitch = g.eyeYaw = g.eyePitch = 0;
      faceRef.current?.setGaze({ eyeYaw: 0, eyePitch: 0 });
      faceLife.eyeBright = 1;
      faceLife.eyeOpen = 1;
      return;
    }

    const t = ctx.clock.elapsedTime;
    const s = state.current;
    const p = phases.current;
    const ex = exprRef.current;
    const isAttentive = attentiveRef.current;
    const energy = Math.max(0, Math.min(1, speechEnergyRef?.current ?? 0));
    const amp = isAttentive ? amplitude * 0.35 : amplitude;
    const isThinking = thinkingRef.current;

    // Reset thinking cycle when entering thinking; never re-fire until exit.
    if (isThinking && !s.thinkingWasActive) {
      s.glance = "idle";
      s.glanceT = t;
      s.thinkingWasActive = true;
    } else if (!isThinking) {
      s.thinkingWasActive = false;
      if (s.glance !== "idle" && s.glance !== "done") {
        s.glance = "idle";
      }
    }

    // —— Thinking: once per cycle ——
    // look up → soft blink → tiny smile → look back to child
    if (isThinking && s.glance !== "done") {
      if (s.glance === "idle") {
        s.glance = "up";
        s.glanceT = t;
      }
      if (s.glance === "up") {
        s.targetYaw = (ex?.gazeYawBias ?? 0) + organic(t, p.eyes, 0.2, 71) * amp * 0.25;
        s.targetPitch = ex?.gazePitchBias ?? 6 * DEG;
        if (t - s.glanceT > 0.45 + Math.random() * 0.2) {
          s.glance = "blink";
          s.glanceT = t;
          if (requestBlinkRef) requestBlinkRef.current = true;
        }
      } else if (s.glance === "blink") {
        if (t - s.glanceT > 0.18) {
          s.glance = "smile";
          s.glanceT = t;
          faceLife.smileBoost = Math.max(faceLife.smileBoost, 0.05);
        }
      } else if (s.glance === "smile") {
        s.targetYaw *= 0.85;
        s.targetPitch *= 0.7;
        if (t - s.glanceT > 0.28) {
          s.glance = "return";
          s.glanceT = t;
        }
      } else if (s.glance === "return") {
        s.targetYaw = 0;
        s.targetPitch = 0;
        if (t - s.glanceT > 0.55) {
          s.glance = "done"; // stay done until thinking exits
        }
      }
    } else if (isAttentive) {
      s.targetYaw = ex?.gazeYawBias ?? 0;
      s.targetPitch = ex?.gazePitchBias ?? 0;
    } else {
      // —— Eye contact with rare brief glance-away (<300ms) ——
      if (s.away === "contact" && t >= s.nextAway && s.glance === "idle") {
        s.away = "away";
        s.awayT = t;
        s.awayYaw = organic(t, p.eyes + 2, 0.8, 83) * amp * 1.4;
        s.awayPitch = organic(t, p.eyes + 4, 0.7, 97) * amp * 0.5;
      }
      if (s.away === "away") {
        s.targetYaw = s.awayYaw;
        s.targetPitch = s.awayPitch;
        if (t - s.awayT > 0.18 + Math.random() * 0.1) {
          // Always <300ms
          s.away = "returning";
          s.awayT = t;
        }
      } else if (s.away === "returning") {
        s.targetYaw = 0;
        s.targetPitch = 0;
        if (t - s.awayT > 0.25) {
          s.away = "contact";
          s.nextAway = t + 5 + Math.random() * 7;
        }
      } else if (t >= s.nextSaccade) {
        // Tiny on-contact micro saccades (still toward child).
        s.targetYaw = organic(t, p.eyes + 3, 0.5, 83) * amp * 0.45 + (ex?.gazeYawBias ?? 0);
        s.targetPitch =
          organic(t, p.eyes + 9, 0.45, 97) * amp * 0.3 + (ex?.gazePitchBias ?? 0);
        s.nextSaccade = t + 2.8 + Math.random() * 3.5;
      } else if (ex) {
        s.targetYaw += ((ex.gazeYawBias ?? 0) - s.targetYaw) * 0.02;
        s.targetPitch += ((ex.gazePitchBias ?? 0) - s.targetPitch) * 0.02;
      }
    }

    let aimYaw = s.targetYaw;
    let aimPitch = s.targetPitch;
    // Prefer eye contact toward pointer / child when not glancing away or thinking-up.
    const holdContact =
      s.away === "contact" &&
      (s.glance === "idle" || s.glance === "done" || s.glance === "return");
    if (fine && holdContact) {
      const px = THREE.MathUtils.clamp(pointer.x, -1, 1);
      const py = THREE.MathUtils.clamp(pointer.y, -1, 1);
      const track = isAttentive ? 0.35 : 0.55;
      aimYaw = THREE.MathUtils.lerp(
        s.targetYaw,
        px * amplitude * (isAttentive ? 0.35 : 0.75),
        track,
      );
      if (!isAttentive) {
        aimPitch = THREE.MathUtils.lerp(s.targetPitch, py * amplitude * 0.55, 0.4);
      }
    }

    const rate = isAttentive ? 0.14 : 0.1;
    s.curYaw += (aimYaw - s.curYaw) * rate;
    s.curPitch += (aimPitch - s.curPitch) * rate;

    const tremor = 0.22 * DEG;
    const jx = organic(t, p.eyes, 1.1, 101) * tremor;
    const jy = organic(t, p.eyes + 5, 0.95, 107) * tremor;

    g.eyeYaw = s.curYaw + jx;
    g.eyePitch = s.curPitch + jy;
    g.headYaw = (s.curYaw + jx) * 0.35 * skeletalDamp;
    g.headPitch = (s.curPitch + jy) * 0.28 * skeletalDamp;

    let bright = ex?.eyeBright ?? 1;
    let open = 1;
    bright *= 0.97 + organic(t, p.eyes + 11, 0.18, 113) * 0.04;

    if (ex?.speechEyeReact) {
      bright *= 1 + energy * 0.1;
      open = 1 - energy * 0.045;
    }
    // Anticipation brighten from presence.
    if (pose.presence.anticipate > 0) {
      bright *= 1 + pose.presence.anticipate * 0.08;
      open = Math.max(open, 1.02 + pose.presence.anticipate * 0.03);
    }

    const targetOpen = Math.max(open, faceLife.eyeOpen > 1.02 ? faceLife.eyeOpen : open);
    // Smooth eye channels ~200ms.
    faceLife.eyeBright += (bright - faceLife.eyeBright) * 0.1;
    faceLife.eyeOpen += (targetOpen - faceLife.eyeOpen) * 0.08;
    if (faceLife.eyeOpen > open + 0.01) {
      faceLife.eyeOpen += (open - faceLife.eyeOpen) * 0.035;
    }

    const f = faceRef.current;
    if (f) {
      f.setGaze({ eyeYaw: g.eyeYaw, eyePitch: g.eyePitch });
    }
  });
}
