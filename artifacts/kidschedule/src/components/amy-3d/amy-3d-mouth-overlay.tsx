import { useMemo, type RefObject } from "react";
import { AMY_STAGE_ASSETS, AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import {
  AMY_STAGE_CANVAS,
  amyStageContainRect,
} from "@/lib/amy/amy-stage-layout";
import { useAmyMouthFrames } from "@/lib/amy/character/use-amy-mouth-frames";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

/** Mouth-only 2D overlay — pairs with Tripo GLB body (no morph targets). */
export function Amy3DMouthOverlay({
  width,
  height,
  speaking,
  listenForAudio,
  audioLevelRef,
  audioMeterActiveRef,
}: {
  width: number;
  height: number;
  speaking: boolean;
  listenForAudio: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
}) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const mouthFrame = useAmyMouthFrames({
    speaking,
    listenForAudio,
    reduced,
    tabHidden: false,
    audioLevelRef,
    audioMeterActiveRef,
  });

  const mouthStyle = useMemo(() => {
    const rect = amyStageContainRect(
      width,
      height,
      AMY_STAGE_CANVAS.width,
      AMY_STAGE_CANVAS.height,
    );
    if (!rect) return null;
    const mw = rect.width * 0.14;
    const mh = rect.height * 0.09;
    const cx = 0.5;
    const cy = 392 / 900;
    return {
      position: "absolute" as const,
      left: rect.left + rect.width * cx - mw / 2,
      top: rect.top + rect.height * cy - mh / 2,
      width: mw,
      height: mh,
      objectFit: "contain" as const,
      pointerEvents: "none" as const,
      zIndex: 2,
    };
  }, [height, width]);

  if (!mouthStyle || (!speaking && !listenForAudio)) return null;

  return (
    <img
      src={AMY_STAGE_ASSETS.talk[mouthFrame]}
      alt=""
      draggable={false}
      aria-hidden
      style={mouthStyle}
    />
  );
}

/** Stage height for a square hero (width = size). */
export function amy3DHeroHeight(size: number): number {
  return Math.round(size * AMY_FULL_ASPECT * 1.12);
}
