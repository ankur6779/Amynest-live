// AmyBlinkFace — the premium Amy face that *blinks*, in a lightweight package
// safe to use everywhere (headers, lists, chat bubbles, FAB, brand marks).
//
// Unlike the hero AmyPortrait it has NO halo, NO 3D head-turn and NO breathing
// loop — just the circular portrait image + soft eyelid overlays driven by a
// cheap setTimeout blink scheduler. So dozens of instances on screen stay
// effectively free, while Amy feels alive (she blinks) instead of being a
// frozen image. prefers-reduced-motion → no blink (static face).

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AMY_PORTRAIT_SRC } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

// Eye centers as fractions of the square portrait — must match AmyPortrait so
// the lids sit exactly on Amy's eyes (measured from amy-avatar-square.png).
const EYE = { y: 0.625, h: 0.145, w: 0.165, lX: 0.365, rX: 0.635 };

interface AmyBlinkFaceProps {
  size: number;
  className?: string;
  /**
   * Reserved talking flag. The premium talking-mouth animation now lives in the
   * dedicated `AmyTalkingHead` (pre-rendered mouth frames); this baked face only
   * blinks, so the flag is accepted for API compatibility but not rendered here.
   */
  speaking?: boolean;
}

export function AmyBlinkFace({ size, className }: AmyBlinkFaceProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let doubleTimer: ReturnType<typeof setTimeout>;
    let doubleOpenTimer: ReturnType<typeof setTimeout>;
    const run = () => {
      setBlinking(true);
      openTimer = setTimeout(() => setBlinking(false), 110);
      if (Math.random() < 0.25) {
        doubleTimer = setTimeout(() => {
          setBlinking(true);
          doubleOpenTimer = setTimeout(() => setBlinking(false), 95);
        }, 230);
      }
      timer = setTimeout(run, 3000 + Math.random() * 4000);
    };
    timer = setTimeout(run, 1000 + Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(openTimer);
      clearTimeout(doubleTimer);
      clearTimeout(doubleOpenTimer);
    };
  }, [reduced]);

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

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <img
        src={AMY_PORTRAIT_SRC}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 42%",
          display: "block",
        }}
      />
      {!reduced && <span style={lidStyle(EYE.lX)} />}
      {!reduced && <span style={lidStyle(EYE.rX)} />}
    </div>
  );
}

export default AmyBlinkFace;
