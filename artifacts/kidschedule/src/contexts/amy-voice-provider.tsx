import { useEffect, type ReactNode } from "react";
import { initAudioUnlock, recordTtsUserGesture } from "@/lib/tts-guard";
import { audioManager } from "@/lib/audio-manager";
import { installAudioSessionLifecycle } from "@/lib/audio-session-coordinator";

/**
 * Ensures a single global audio manager lifecycle for the whole PWA / Capacitor shell.
 * All modules must use `useAmyVoice` — never raw Audio() or direct audioManager control.
 */
export function AmyVoiceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAudioUnlock();

    const onGesture = () => recordTtsUserGesture();
    document.addEventListener("click", onGesture, { capture: true, passive: true });
    document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });

    audioManager.installLifecycle();
    audioManager.warmMediaPipeline(true);
    installAudioSessionLifecycle();
    return () => {
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("pointerdown", onGesture, true);
    };
  }, []);

  return children;
}
