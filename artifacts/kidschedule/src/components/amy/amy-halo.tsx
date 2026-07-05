import { forwardRef, memo } from "react";
import { AMY_HALO } from "@/lib/amy/character/amy-character-constants";
import { AMY_STAGE_BODY } from "@/lib/amy/amy-stage-layout";

export interface AmyHaloProps {
  width: number;
  height: number;
  visible?: boolean;
}

export const AmyHalo = memo(
  forwardRef<HTMLSpanElement, AmyHaloProps>(function AmyHalo(
    { width, height, visible = true },
    ref,
  ) {
    if (!visible) return null;
    const size = Math.round(width * AMY_HALO.size);
    const centerY = AMY_STAGE_BODY.centerY * height;
    return (
      <span
        ref={ref}
        aria-hidden
        style={{
          position: "absolute",
          left: `${AMY_STAGE_BODY.centerX * 100}%`,
          top: centerY,
          width: size,
          height: size,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          pointerEvents: "none",
          willChange: "transform, opacity",
          opacity: 0.5,
        }}
      />
    );
  }),
);
