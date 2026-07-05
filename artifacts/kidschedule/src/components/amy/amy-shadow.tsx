import { forwardRef, memo } from "react";
import { AMY_SHADOW } from "@/lib/amy/character/amy-character-constants";

export interface AmyShadowProps {
  width: number;
  height: number;
  visible?: boolean;
}

export const AmyShadow = memo(
  forwardRef<HTMLSpanElement, AmyShadowProps>(function AmyShadow(
    { width, height, visible = true },
    ref,
  ) {
    if (!visible) return null;
    return (
      <span
        ref={ref}
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: Math.round(height * AMY_SHADOW.bottom),
          width: Math.round(width * AMY_SHADOW.width),
          height: Math.round(height * AMY_SHADOW.height),
          transform: "translateX(-50%) scale(1, 0.85)",
          transformOrigin: "center center",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.44) 0%, rgba(0,0,0,0.18) 45%, transparent 72%)",
          pointerEvents: "none",
          willChange: "transform, opacity",
          opacity: 0.4,
        }}
      />
    );
  }),
);
