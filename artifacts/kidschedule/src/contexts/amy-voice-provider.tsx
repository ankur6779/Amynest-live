import { useEffect, type ReactNode } from "react";
import { audioManager } from "@/lib/audio-manager";
import { initAudioUnlock, recordTtsUserGesture } from "@/lib/tts-guard";

/**
 * Ensures a single global audio manager lifecycle for the whole PWA / Capacitor shell.
 * All modules must use `useAmyVoice` (backed by audioManager) — never raw Audio().
 */
export function AmyVoiceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAudioUnlock();

    const onGesture = () => recordTtsUserGesture();
    document.addEventListener("click", onGesture, { capture: true, passive: true });
    document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });

    audioManager.installLifecycle();
    audioManager.warmMediaPipeline(true);
    return () => {
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("pointerdown", onGesture, true);
      audioManager.stopAll();
    };
  }, []);

  return children;
}
