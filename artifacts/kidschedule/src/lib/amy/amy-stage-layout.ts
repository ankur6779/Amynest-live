/** Normalized layout on the 720×900 full-body canvas (see build-amy-full-assets.py). */

export const AMY_STAGE_CANVAS = {
  width: 720,
  height: 900,
} as const;

/** Eye centres as UV fractions of the image (measured on amy-idle.webp). */
export const AMY_STAGE_EYE = {
  y: 0.565,
  h: 0.048,
  w: 0.052,
  lX: 0.447,
  rX: 0.576,
} as const;

/** Body anchor points for halo / shadow (UV fractions). */
export const AMY_STAGE_BODY = {
  centerX: 0.5,
  centerY: 0.57,
  feetY: 0.935,
} as const;

export const AMY_STAGE_EYELID_GRADIENT =
  "linear-gradient(180deg,#F1ECF9 0%,#E7DEF3 60%,#D8C9EA 100%)";

export interface AmyStageContainRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** object-fit: contain draw rect for an image inside a box. */
export function amyStageContainRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): AmyStageContainRect | null {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return null;
  }
  const containerAspect = containerW / containerH;
  const imageAspect = naturalW / naturalH;
  if (imageAspect > containerAspect) {
    const width = containerW;
    const height = containerW / imageAspect;
    return { left: 0, top: (containerH - height) / 2, width, height };
  }
  const height = containerH;
  const width = containerH * imageAspect;
  return { left: (containerW - width) / 2, top: 0, width, height };
}

export interface AmyStageEyeSlot {
  left: number;
  top: number;
  width: number;
  height: number;
}

function eyeSlot(
  rect: AmyStageContainRect,
  cx: number,
): AmyStageEyeSlot {
  const width = AMY_STAGE_EYE.w * rect.width;
  const height = AMY_STAGE_EYE.h * rect.height;
  const centerX = rect.left + cx * rect.width;
  const centerY = rect.top + AMY_STAGE_EYE.y * rect.height;
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
  };
}

export interface AmyStageEyeLayout {
  rect: AmyStageContainRect;
  left: AmyStageEyeSlot;
  right: AmyStageEyeSlot;
  pupil: { width: number; height: number; offsetX: number; offsetY: number };
}

/** Map UV eye anchors onto the rendered image rect; null when layout is invalid. */
export function amyStageEyeLayout(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): AmyStageEyeLayout | null {
  const rect = amyStageContainRect(containerW, containerH, naturalW, naturalH);
  if (!rect) return null;
  const left = eyeSlot(rect, AMY_STAGE_EYE.lX);
  const right = eyeSlot(rect, AMY_STAGE_EYE.rX);
  const pupilW = AMY_STAGE_EYE.w * rect.width * 0.22;
  const pupilH = AMY_STAGE_EYE.h * rect.height * 0.28;
  return {
    rect,
    left,
    right,
    pupil: {
      width: pupilW,
      height: pupilH,
      offsetX: pupilW * 0.35,
      offsetY: pupilH * 0.85,
    },
  };
}
