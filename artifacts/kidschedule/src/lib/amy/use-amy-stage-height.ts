import { useEffect, useState } from "react";
import {
  AMY_STAGE_HEIGHT_MAX,
  AMY_STAGE_HEIGHT_MIN,
  AMY_STAGE_VH_RATIO,
} from "@/lib/amy/character/amy-character-constants";

/**
 * Responsive full-body Amy height.
 * Default: min(58vh, 420px), clamped to 220–420px.
 * Explicit {@link explicit} prop preserves legacy caller sizing.
 */
export function useAmyStageHeight(explicit?: number): number {
  const [height, setHeight] = useState(explicit ?? AMY_STAGE_HEIGHT_MIN);

  useEffect(() => {
    if (explicit != null) {
      setHeight(explicit);
      return;
    }
    const calc = () => {
      const vh = window.innerHeight;
      const adaptive = Math.min(vh * AMY_STAGE_VH_RATIO, AMY_STAGE_HEIGHT_MAX);
      setHeight(
        Math.max(AMY_STAGE_HEIGHT_MIN, Math.min(AMY_STAGE_HEIGHT_MAX, Math.round(adaptive))),
      );
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [explicit]);

  return height;
}

/** Legacy square `size` prop → full-body height (preserves ~similar visual weight). */
export function squareSizeToStageHeight(size: number): number {
  return Math.round(size * 1.12);
}
