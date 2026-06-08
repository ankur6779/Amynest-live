import { useEffect, useRef, useState, type RefObject } from "react";
import {
  clampMicLevel,
  micLevelToGlowOpacity,
  micLevelToHaloScale,
  micLevelToParticleCount,
  smoothMicLevel,
} from "@/lib/talking-amy-mic-visual";

export type TalkingAmyMicVisual = {
  level: number;
  haloScale: number;
  glowOpacity: number;
  particleCount: number;
};

const IDLE_VISUAL: TalkingAmyMicVisual = {
  level: 0,
  haloScale: 1,
  glowOpacity: 0.45,
  particleCount: 2,
};

/**
 * 60fps-smoothed mic visualization derived from audioLevelRef.
 */
export function useTalkingAmyMicVisual(
  active: boolean,
  audioLevelRef: RefObject<number>,
  reducedMotion: boolean,
  maxParticles = 6,
): TalkingAmyMicVisual {
  const [visual, setVisual] = useState<TalkingAmyMicVisual>(IDLE_VISUAL);
  const smoothRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      smoothRef.current = 0;
      setVisual(IDLE_VISUAL);
      return;
    }

    const tick = () => {
      const raw = clampMicLevel(audioLevelRef.current ?? 0);
      smoothRef.current = smoothMicLevel(smoothRef.current, raw);
      const level = smoothRef.current;
      setVisual({
        level,
        haloScale: micLevelToHaloScale(level, { reducedMotion }),
        glowOpacity: micLevelToGlowOpacity(level, { reducedMotion }),
        particleCount: micLevelToParticleCount(level, maxParticles, reducedMotion),
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, audioLevelRef, maxParticles, reducedMotion]);

  return visual;
}
