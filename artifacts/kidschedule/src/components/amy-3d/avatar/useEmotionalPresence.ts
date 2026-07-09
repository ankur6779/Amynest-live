// Emotional presence — speech anticipation / finish + smooth expression blending.
//
// Presentation only. Tracks Amy3DState transitions and writes soft offsets into
// pose.presence so the compose frame can inhale / brighten / settle without
// snapping. Expression blend window: ~220ms (within 150–300ms).

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import type { AmyPose } from "./pose";
import { expressionForState } from "./expression-presets";

export type PresencePhase =
  | "none"
  | "anticipate"
  | "speaking"
  | "finish"
  | "celebrateSettle";

const DEG = Math.PI / 180;

function blendAlpha(dt: number, ms: number): number {
  return 1 - Math.exp(-dt / (ms / 1000));
}

export interface EmotionalPresenceOptions {
  state: Amy3DState;
  reduced?: boolean;
  pose: AmyPose;
}

/**
 * Drives speech anticipation (150–250ms), speech finish settle, celebration
 * settle, and smooth smile/eye/lean blending. Writes pose.presence + smileBase.
 */
export function useEmotionalPresence({
  state,
  reduced = false,
  pose,
}: EmotionalPresenceOptions): void {
  const prevState = useRef<Amy3DState>(state);
  const phase = useRef<PresencePhase>("none");
  const phaseStart = useRef(0);
  const anticipateDur = useRef(0.18);
  const finishDur = useRef(0.45);
  const celebrateSettleUntil = useRef(0);

  const blended = useRef({
    smile: expressionForState(state).smile,
    eyeBright: expressionForState(state).eyeBright,
    lean: expressionForState(state).lean,
    headTilt: expressionForState(state).headTilt,
  });

  useFrame((_ctx, delta) => {
    const t = _ctx.clock.elapsedTime;
    const presence = pose.presence;
    const face = pose.face;
    const live = expressionForState(state);

    if (reduced) {
      presence.inhale = 0;
      presence.headLift = 0;
      presence.anticipate = 0;
      presence.finish = 0;
      presence.phase = "none";
      phase.current = "none";
      prevState.current = state;
      return;
    }

    if (prevState.current !== state) {
      const from = prevState.current;
      const to = state;
      prevState.current = to;

      if (to === "speaking" && from !== "speaking") {
        phase.current = "anticipate";
        phaseStart.current = t;
        anticipateDur.current = 0.15 + Math.random() * 0.1;
        face.smileBoost = Math.max(face.smileBoost, 0.05);
        face.eyeBright = Math.max(face.eyeBright, 1.1);
      } else if (from === "speaking" && to !== "speaking") {
        phase.current = "finish";
        phaseStart.current = t;
        finishDur.current = 0.35 + Math.random() * 0.2;
        face.smileBoost = Math.max(face.smileBoost, 0.04);
      }

      if (to === "celebrating") {
        phase.current = "none";
        face.smileBoost = Math.max(face.smileBoost, 0.1);
      } else if (from === "celebrating") {
        phase.current = "celebrateSettle";
        phaseStart.current = t;
        celebrateSettleUntil.current = t + 0.6 + Math.random() * 0.35;
        face.smileBoost = Math.max(face.smileBoost, 0.08);
      }

      if (to === "thinking") {
        face.smileBoost = Math.max(face.smileBoost, 0.02);
      }
    }

    let inhale = 0;
    let headLift = 0;
    let anticipate = 0;
    let finish = 0;

    if (phase.current === "anticipate") {
      const p = (t - phaseStart.current) / anticipateDur.current;
      if (p >= 1) {
        phase.current = "speaking";
      } else {
        const e = Math.sin((Math.min(1, p) * Math.PI) / 2);
        anticipate = e;
        inhale = e * 0.012;
        headLift = e * 0.7 * DEG;
        face.eyeBright = Math.max(face.eyeBright, 1.05 + e * 0.08);
        face.smileBoost = Math.max(face.smileBoost, e * 0.06);
        face.eyeOpen = Math.max(face.eyeOpen, 1.02 + e * 0.03);
      }
    } else if (phase.current === "speaking") {
      if (state !== "speaking") {
        phase.current = "finish";
        phaseStart.current = t;
      }
    } else if (phase.current === "finish") {
      const p = (t - phaseStart.current) / finishDur.current;
      if (p >= 1) {
        phase.current = "none";
      } else {
        const e = 1 - Math.min(1, p);
        finish = e;
        inhale = -Math.sin(Math.min(1, p) * Math.PI) * 0.008;
        headLift = e * 0.15 * DEG;
        face.smileBoost = Math.max(face.smileBoost, 0.03 * e);
      }
    } else if (phase.current === "celebrateSettle") {
      if (t >= celebrateSettleUntil.current) {
        phase.current = "none";
      } else {
        const remain = celebrateSettleUntil.current - t;
        finish = Math.min(1, remain / 0.5);
        face.smileBoost = Math.max(face.smileBoost, 0.05 * finish);
      }
    }

    if (state === "speaking" && phase.current === "none") {
      phase.current = "speaking";
    }

    presence.inhale = inhale;
    presence.headLift = headLift;
    presence.anticipate = anticipate;
    presence.finish = finish;
    presence.phase = phase.current;

    // Expression blend ~220ms — never abrupt.
    const a = blendAlpha(delta, 220);
    let smileTarget = live.smile;
    if (phase.current === "finish") smileTarget = Math.max(live.smile, 0.14);
    else if (phase.current === "anticipate") smileTarget = live.smile + 0.05;
    else if (phase.current === "celebrateSettle") smileTarget = Math.max(live.smile, 0.2);

    blended.current.smile += (smileTarget - blended.current.smile) * a;
    blended.current.eyeBright += (live.eyeBright - blended.current.eyeBright) * a;
    blended.current.lean += (live.lean - blended.current.lean) * a;
    blended.current.headTilt += (live.headTilt - blended.current.headTilt) * a;

    face.smileBase = blended.current.smile;
  });
}
