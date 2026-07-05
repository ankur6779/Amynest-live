import { memo, useMemo, type CSSProperties } from "react";
import { AMY_STAGE_ASSETS } from "@/lib/amy/amy-stage-assets";
import { AMY_STAGE_EYE, AMY_STAGE_EYELID_GRADIENT } from "@/lib/amy/amy-stage-layout";
import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";

export interface AmyCharacterBodyProps {
  width: number;
  height: number;
  alt: string;
  staticSrc: string;
  talking: boolean;
  mouthFrame: AmyMouthFrame;
  blinking: boolean;
  eyesClosed?: boolean;
  pupilLeftRef: React.RefObject<HTMLSpanElement | null>;
  pupilRightRef: React.RefObject<HTMLSpanElement | null>;
  bodyImgRef: React.RefObject<HTMLImageElement | null>;
  reduced: boolean;
}

const imgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  pointerEvents: "none",
};

function lidStyle(
  cx: number,
  width: number,
  height: number,
  closed: boolean,
): CSSProperties {
  const lidW = AMY_STAGE_EYE.w * width;
  const lidH = AMY_STAGE_EYE.h * height;
  const lidTop = (AMY_STAGE_EYE.y - AMY_STAGE_EYE.h / 2) * height;
  return {
    position: "absolute",
    left: cx * width - lidW / 2,
    top: lidTop,
    width: lidW,
    height: lidH,
    borderRadius: "18% 18% 48% 48% / 22% 22% 80% 80%",
    background: AMY_STAGE_EYELID_GRADIENT,
    boxShadow: "inset 0 -1px 2px rgba(120,90,160,0.35)",
    transformOrigin: "center top",
    transform: `scaleY(${closed ? 1 : 0})`,
    transition: closed ? "none" : "transform 80ms ease-in-out",
    pointerEvents: "none",
    zIndex: 4,
  };
}

function pupilStyle(cx: number, width: number, height: number): CSSProperties {
  const pupilW = AMY_STAGE_EYE.w * width * 0.22;
  const pupilH = AMY_STAGE_EYE.h * height * 0.28;
  const top = AMY_STAGE_EYE.y * height - pupilH * 0.85;
  const left = cx * width - pupilW * 0.35;
  return {
    position: "absolute",
    left,
    top,
    width: pupilW,
    height: pupilH,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.92) 0%, transparent 72%)",
    pointerEvents: "none",
    zIndex: 3,
    willChange: "transform, opacity",
  };
}

/** Full-body Amy — hard-cut mouth frames; transform driven by engine. */
export const AmyCharacterBody = memo(function AmyCharacterBody({
  width,
  height,
  alt,
  staticSrc,
  talking,
  mouthFrame,
  blinking,
  eyesClosed = false,
  pupilLeftRef,
  pupilRightRef,
  bodyImgRef,
  reduced,
}: AmyCharacterBodyProps) {
  const src = useMemo(
    () => (talking ? AMY_STAGE_ASSETS.talk[mouthFrame] : staticSrc),
    [talking, mouthFrame, staticSrc],
  );
  const lidsClosed = eyesClosed || blinking;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img
        ref={bodyImgRef}
        key={talking ? `talk-${mouthFrame}` : "static"}
        src={src}
        alt={alt}
        draggable={false}
        style={imgStyle}
      />
      {!reduced && !eyesClosed && (
        <>
          <span ref={pupilLeftRef} aria-hidden style={pupilStyle(AMY_STAGE_EYE.lX, width, height)} />
          <span ref={pupilRightRef} aria-hidden style={pupilStyle(AMY_STAGE_EYE.rX, width, height)} />
        </>
      )}
      {!reduced && (
        <>
          <span aria-hidden style={lidStyle(AMY_STAGE_EYE.lX, width, height, lidsClosed)} />
          <span aria-hidden style={lidStyle(AMY_STAGE_EYE.rX, width, height, lidsClosed)} />
        </>
      )}
    </div>
  );
});
