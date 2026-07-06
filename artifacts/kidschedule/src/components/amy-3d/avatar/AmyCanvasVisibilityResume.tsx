import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Kick the render loop when the tab becomes visible again. */
export function AmyCanvasVisibilityResume({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  return null;
}
