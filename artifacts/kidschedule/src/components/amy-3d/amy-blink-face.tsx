// AmyBlinkFace — lightweight full-body Amy with blink (headers, lists, bubbles).

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AMY_ICON_SRC, AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import { AMY_STAGE_EYE, AMY_STAGE_EYELID_GRADIENT } from "@/lib/amy/amy-stage-layout";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

interface AmyBlinkFaceProps {
  size: number;
  className?: string;
  speaking?: boolean;
}

export function AmyBlinkFace({ size, className }: AmyBlinkFaceProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [blinking, setBlinking] = useState(false);
  const height = size;
  const width = Math.round(size * AMY_FULL_ASPECT);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    const run = () => {
      setBlinking(true);
      openTimer = setTimeout(() => setBlinking(false), 110);
      timer = setTimeout(run, 3000 + Math.random() * 4000);
    };
    timer = setTimeout(run, 1000 + Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(openTimer);
    };
  }, [reduced]);

  const lidW = AMY_STAGE_EYE.w * width;
  const lidH = AMY_STAGE_EYE.h * height;
  const lidTop = (AMY_STAGE_EYE.y - AMY_STAGE_EYE.h / 2) * height;
  const lidStyle = (cx: number): CSSProperties => ({
    position: "absolute",
    left: cx * width - lidW / 2,
    top: lidTop,
    width: lidW,
    height: lidH,
    borderRadius: "18% 18% 48% 48% / 22% 22% 80% 80%",
    background: AMY_STAGE_EYELID_GRADIENT,
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
        width,
        height,
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <img
        src={AMY_ICON_SRC}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      {!reduced && (
        <>
          <span style={lidStyle(AMY_STAGE_EYE.lX)} />
          <span style={lidStyle(AMY_STAGE_EYE.rX)} />
        </>
      )}
    </div>
  );
}

export default AmyBlinkFace;
