// useIdleAnimation — organic "alive at rest" layer.
//
// Low-frequency fbm noise for breathing, sway, tilt — independent phases.
// Listening: occasional encouraging nod + soft blink request + micro smile
// (randomized 6–10s, never a constant loop).

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { AmyPose } from "./pose";
import type { AmyExpressionPreset } from "./expression-presets";
import { createOrganicPhases, organic } from "./organic-noise";

export interface IdleAnimationOptions {
  reduced?: boolean;
  breathingAmplitude?: number;
  tiltAmplitude?: number;
  floatAmplitude?: number;
  attentive?: boolean;
  expression?: AmyExpressionPreset;
  speechEnergyRef?: { current: number };
  /** Soft blink cue for listening feedback (occasional). */
  requestBlinkRef?: { current: boolean };
}

const DEG = Math.PI / 180;
const MAX_TILT = 1 * DEG;

export function useIdleAnimation(
  pose: AmyPose,
  options: IdleAnimationOptions = {},
): void {
  const {
    reduced = false,
    breathingAmplitude = 0.011,
    tiltAmplitude = MAX_TILT,
    floatAmplitude = 0.014,
    attentive = false,
    expression,
    speechEnergyRef,
    requestBlinkRef,
  } = options;

  const phases = useRef(createOrganicPhases());
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const attentiveRef = useRef(attentive);
  attentiveRef.current = attentive;
  const nodRef = useRef({
    next: 6 + Math.random() * 4,
    active: 0,
    amp: 0,
    dur: 0.4,
  });

  useFrame((ctx, delta) => {
    const idle = pose.idle;
    if (reduced) {
      idle.posY = 0;
      idle.rotX = idle.rotY = idle.rotZ = 0;
      idle.scale = 1;
      idle.gestureAmp = 1;
      return;
    }

    const t = ctx.clock.elapsedTime;
    const p = phases.current;
    const ex = exprRef.current;
    const damp = (ex?.idleDamp ?? 1) * (attentiveRef.current ? 0.55 : 1);
    const breathMul = ex?.breathRate ?? 1;
    const energy = Math.max(0, Math.min(1, speechEnergyRef?.current ?? 0));
    const energyBoost = 1 + energy * 0.18;
    idle.gestureAmp = energyBoost;

    const tilt = Math.min(tiltAmplitude, MAX_TILT) * damp * energyBoost;

    const breath = organic(t, p.breath, 0.22 * breathMul, 11);
    // Presence inhale/exhale layered on breathing.
    idle.scale =
      1 +
      breath * breathingAmplitude * energyBoost +
      pose.presence.inhale;

    const floatN = organic(t, p.breath + 40, 0.14, 23);
    idle.posY =
      floatN * floatAmplitude * damp +
      (ex?.lean ? floatAmplitude * 0.12 : 0) +
      pose.presence.headLift * 0.15;

    const swayZ = organic(t, p.sway, 0.11, 31);
    const swayX = organic(t, p.head, 0.09, 47);
    const swayY = organic(t, p.sway + 17, 0.08, 59);

    // Blended lean/tilt from expression (already smoothed by presence hook).
    idle.rotZ = swayZ * tilt + (ex?.headTilt ?? 0) * 0.85;
    idle.rotX =
      swayX * tilt * 0.45 -
      (ex?.lean ?? 0) * 0.9 -
      pose.presence.headLift;
    idle.rotY = swayY * tilt * 0.5;

    // Listening feedback — occasional, randomized, never constant loop.
    const nod = nodRef.current;
    if (ex?.microNod) {
      if (t >= nod.next && nod.active <= 0) {
        nod.dur = 0.38 + Math.random() * 0.22;
        nod.active = nod.dur;
        nod.amp = (0.4 + Math.random() * 0.3) * DEG;
        nod.next = t + 6 + Math.random() * 4;
        pose.face.smileBoost = Math.max(pose.face.smileBoost, 0.05);
        pose.face.eyeOpen = Math.max(pose.face.eyeOpen, 1.05);
        // Soft blink ~half the time so it doesn't feel metronomic.
        if (requestBlinkRef && Math.random() < 0.55) {
          requestBlinkRef.current = true;
        }
      }
      if (nod.active > 0 && nod.dur > 0) {
        const prog = 1 - nod.active / nod.dur;
        idle.rotX -= Math.sin(Math.PI * Math.min(1, prog)) * nod.amp;
        nod.active -= delta;
        if (nod.active <= 0) {
          pose.face.smileBoost *= 0.5;
        }
      }
    }
  });
}
