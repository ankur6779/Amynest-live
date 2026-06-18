import { useEffect, useRef } from "react";
import { isGameSoundEnabled } from "@/lib/game-feedback";

export const CRYSTAL_GARDEN_DANCE_URL = "/health-lab-audio/crystal-garden-dance.mp3";

let preloaded: HTMLAudioElement | null = null;
let activeDance: HTMLAudioElement | null = null;

function createDanceElement(): HTMLAudioElement {
  const el = new Audio(CRYSTAL_GARDEN_DANCE_URL);
  el.preload = "auto";
  el.loop = true;
  el.volume = 0.55;
  return el;
}

/** Warm the dance clip during onboarding/calibration for instant dance-phase start. */
export function preloadCrystalGardenDance(): void {
  if (typeof window === "undefined" || !isGameSoundEnabled()) return;
  if (!preloaded) {
    preloaded = createDanceElement();
    preloaded.load();
  }
}

export function stopCrystalGardenDance(): void {
  const el = activeDance;
  activeDance = null;
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
}

export function startCrystalGardenDance(): void {
  if (!isGameSoundEnabled()) return;
  stopCrystalGardenDance();

  const el = preloaded ?? createDanceElement();
  preloaded = el;
  activeDance = el;

  try {
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay policy — user already interacted in game */
    });
  } catch {
    /* ignore */
  }
}

/** Play/stop dance music exactly when the dance phase toggles. */
export function useCrystalGardenDanceMusic(active: boolean): void {
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      startCrystalGardenDance();
    } else if (!active && wasActive.current) {
      stopCrystalGardenDance();
    }
    wasActive.current = active;
    return () => {
      if (wasActive.current) stopCrystalGardenDance();
    };
  }, [active]);
}
