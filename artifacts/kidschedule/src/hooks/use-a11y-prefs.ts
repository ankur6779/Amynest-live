import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getInclusiveTimeScale } from "@/lib/game-a11y";

function matchesQuery(query: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchesQuery(query));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

export interface A11yPrefs {
  reducedMotion: boolean;
  reducedTransparency: boolean;
  moreContrast: boolean;
  /** Multiplier for timers / flash durations (1 or 1.5). */
  timeScale: number;
}

/** Combined OS accessibility preferences for Gaming Hub. */
export function useA11yPrefs(): A11yPrefs {
  const reducedMotion = useReducedMotion();
  const reducedTransparency = useMediaQuery("(prefers-reduced-transparency: reduce)");
  const moreContrast = useMediaQuery("(prefers-contrast: more)");
  return {
    reducedMotion,
    reducedTransparency,
    moreContrast,
    timeScale: getInclusiveTimeScale(reducedMotion),
  };
}
