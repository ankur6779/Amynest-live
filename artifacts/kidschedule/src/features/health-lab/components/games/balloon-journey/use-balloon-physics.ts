import { useEffect, useRef, useState } from "react";

export interface BalloonPhysicsSnapshot {
  /** Vertical offset in px (negative = higher). */
  y: number;
  swayX: number;
  rotate: number;
  scaleY: number;
  scaleX: number;
  ropeAngle: number;
  ropeCurve: number;
  bobPhase: number;
  momentum: number;
}

const REST_Y = 0;
const MAX_RISE = -140;
const LIFT_ACCEL = 420;
const GRAVITY = 180;
const DAMPING = 0.92;
const MAX_VY = 220;
const SWAY_SPEED = 1.8;
const ROPE_LAG = 0.08;

export function useBalloonPhysics(holding: boolean, active: boolean, reduced: boolean) {
  const [snapshot, setSnapshot] = useState<BalloonPhysicsSnapshot>({
    y: REST_Y,
    swayX: 0,
    rotate: 0,
    scaleY: 1,
    scaleX: 1,
    ropeAngle: 0,
    ropeCurve: 0,
    bobPhase: 0,
    momentum: 0,
  });

  const stateRef = useRef({
    y: REST_Y,
    vy: 0,
    swayX: 0,
    swayTarget: 0,
    swayPhase: 0,
    rotate: 0,
    ropeAngle: 0,
    ropeTarget: 0,
    bobPhase: 0,
    lastTime: 0,
  });

  useEffect(() => {
    if (!active || reduced) {
      const targetY = holding ? MAX_RISE * 0.5 : REST_Y;
      setSnapshot((s) => ({
        ...s,
        y: active ? targetY : REST_Y,
        rotate: 0,
        swayX: 0,
        scaleY: 1,
        scaleX: 1,
      }));
      return;
    }

    let raf = 0;
    const tick = (now: number) => {
      const s = stateRef.current;
      const dt = s.lastTime ? Math.min((now - s.lastTime) / 1000, 0.05) : 0.016;
      s.lastTime = now;

      s.bobPhase += dt * (holding ? 2.2 : 1.4);
      const bob = Math.sin(s.bobPhase) * (holding ? 3 : 5);
      const breathe = 1 + Math.sin(s.bobPhase * 0.7) * 0.015;

      if (holding) {
        s.vy += LIFT_ACCEL * dt;
        s.vy = Math.min(s.vy, MAX_VY);
        s.swayPhase += dt * SWAY_SPEED;
        s.swayTarget = Math.sin(s.swayPhase) * 14;
      } else {
        s.vy -= GRAVITY * dt;
        s.vy *= DAMPING;
        s.swayPhase += dt * 0.9;
        s.swayTarget = Math.sin(s.swayPhase) * 6;
      }

      s.y += s.vy * dt;
      if (holding) {
        const holdTarget = MAX_RISE * 0.85 + bob;
        s.y = s.y * 0.92 + holdTarget * 0.08;
      } else {
        s.y = s.y * 0.96 + (REST_Y + bob) * 0.04;
      }
      s.y = Math.max(MAX_RISE, Math.min(REST_Y + 8, s.y));

      s.swayX += (s.swayTarget - s.swayX) * 0.06;
      const targetRotate = holding
        ? Math.sin(s.swayPhase * 1.1) * 3.5
        : Math.sin(s.bobPhase * 0.8) * 2.5;
      s.rotate += (targetRotate - s.rotate) * 0.08;

      s.ropeTarget = s.swayX * 0.12 + s.vy * 0.004;
      s.ropeAngle += (s.ropeTarget - s.ropeAngle) * ROPE_LAG;

      const stretch = holding ? 1 + Math.min(s.vy / MAX_VY, 1) * 0.08 : breathe;
      const squash = holding ? 1 - Math.min(s.vy / MAX_VY, 1) * 0.04 : 1 / breathe;

      setSnapshot({
        y: s.y,
        swayX: s.swayX,
        rotate: s.rotate,
        scaleY: stretch,
        scaleX: squash,
        ropeAngle: s.ropeAngle,
        ropeCurve: s.swayX * 0.15,
        bobPhase: s.bobPhase,
        momentum: Math.min(1, Math.abs(s.vy) / MAX_VY),
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holding, active, reduced]);

  return snapshot;
}
