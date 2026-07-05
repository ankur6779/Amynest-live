import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AMY_STAGE_ASSETS } from "@/lib/amy/amy-stage-assets";
import {
  AMY_STAGE_EYELID_GRADIENT,
  amyStageEyeLayout,
  type AmyStageEyeLayout,
} from "@/lib/amy/amy-stage-layout";
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

function lidStyle(slot: AmyStageEyeLayout["left"], closed: boolean): CSSProperties {
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
    transform: `scaleY(${closed ? 1 : 0})`,
    transition: closed ? "none" : "transform 80ms ease-in-out",
    pointerEvents: "none",
    zIndex: 4,
  };
}

function pupilStyle(
  slot: AmyStageEyeLayout["left"],
  pupil: AmyStageEyeLayout["pupil"],
): CSSProperties {
  return {
    position: "absolute",
    left: slot.left + slot.width / 2 - pupil.offsetX,
    top: slot.top + slot.height / 2 - pupil.offsetY,
    width: pupil.width,
    height: pupil.height,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.92) 0%, transparent 72%)",
    pointerEvents: "none",
    zIndex: 3,
    willChange: "transform, opacity",
  };
}

/** Full-body Amy — hard-cut mouth frames; eyes anchored to the rendered image UV. */
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
  const [eyeLayout, setEyeLayout] = useState<AmyStageEyeLayout | null>(null);

  const syncEyeLayout = useCallback(() => {
    const img = bodyImgRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) {
      setEyeLayout(null);
      return;
    }
    setEyeLayout(amyStageEyeLayout(width, height, img.naturalWidth, img.naturalHeight));
  }, [bodyImgRef, height, width]);

  useEffect(() => {
    syncEyeLayout();
  }, [syncEyeLayout, src]);

  const lidsClosed = eyesClosed || blinking;
  const showEyes = !reduced && !eyesClosed && eyeLayout != null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img
        ref={bodyImgRef}
        key={talking ? `talk-${mouthFrame}` : "static"}
        src={src}
        alt={alt}
        draggable={false}
        style={imgStyle}
        onLoad={syncEyeLayout}
      />
      {showEyes && (
        <>
          <span ref={pupilLeftRef} aria-hidden style={pupilStyle(eyeLayout.left, eyeLayout.pupil)} />
          <span ref={pupilRightRef} aria-hidden style={pupilStyle(eyeLayout.right, eyeLayout.pupil)} />
          <span aria-hidden style={lidStyle(eyeLayout.left, lidsClosed)} />
          <span aria-hidden style={lidStyle(eyeLayout.right, lidsClosed)} />
        </>
      )}
    </div>
  );
});
