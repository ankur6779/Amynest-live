import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { AMY_ICON_SRC, AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import {
  AMY_STAGE_EYELID_GRADIENT,
  amyStageEyeLayout,
  type AmyStageEyeLayout,
} from "@/lib/amy/amy-stage-layout";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

interface AmyBlinkFaceProps {
  size: number;
  className?: string;
  speaking?: boolean;
}

function lidStyle(slot: AmyStageEyeLayout["left"], blinking: boolean): CSSProperties {
  return {
    position: "absolute",
    left: slot.left,
    top: slot.top,
    width: slot.width,
    height: slot.height,
    borderRadius: "18% 18% 48% 48% / 22% 22% 80% 80%",
    background: AMY_STAGE_EYELID_GRADIENT,
    boxShadow: "inset 0 -1px 2px rgba(120,90,160,0.35)",
    transformOrigin: "center top",
    transform: `scaleY(${blinking ? 1 : 0})`,
    transition: "transform 80ms ease-in-out",
    pointerEvents: "none",
    zIndex: 2,
  };
}

export function AmyBlinkFace({ size, className }: AmyBlinkFaceProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [blinking, setBlinking] = useState(false);
  const [eyeLayout, setEyeLayout] = useState<AmyStageEyeLayout | null>(null);
  const height = size;
  const width = Math.round(size * AMY_FULL_ASPECT);

  const syncEyeLayout = useCallback(
    (img: HTMLImageElement) => {
      if (!img.naturalWidth || !img.naturalHeight) {
        setEyeLayout(null);
        return;
      }
      setEyeLayout(amyStageEyeLayout(width, height, img.naturalWidth, img.naturalHeight));
    },
    [height, width],
  );

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

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <img
        src={AMY_ICON_SRC}
        alt=""
        draggable={false}
        onLoad={(e) => syncEyeLayout(e.currentTarget)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      {!reduced && eyeLayout && (
        <>
          <span style={lidStyle(eyeLayout.left, blinking)} />
          <span style={lidStyle(eyeLayout.right, blinking)} />
        </>
      )}
    </div>
  );
}

export default AmyBlinkFace;
