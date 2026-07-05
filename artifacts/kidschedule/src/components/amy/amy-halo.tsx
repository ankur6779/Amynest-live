import { forwardRef, memo } from "react";
import { AMY_HALO } from "@/lib/amy/character/amy-character-constants";

export interface AmyHaloProps {
  width: number;
  height: number;
  visible?: boolean;
}

export const AmyHalo = memo(
  forwardRef<HTMLSpanElement, AmyHaloProps>(function AmyHalo(
    { width, visible = true },
    ref,
  ) {
    if (!visible) return null;
    const size = Math.round(width * AMY_HALO.size);
    return (
      <span
        ref={ref}
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: `${AMY_HALO.top * 100}%`,
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
