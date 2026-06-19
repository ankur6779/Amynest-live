let installed = false;

export function installGlobalAudioWarmupOnGesture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const boost = () => {
    void import("@/lib/global-audio-warmup").then((mod) => {
      mod.installGlobalAudioWarmupOnGesture();
      mod.initGlobalAudioWarmup();
    });
  };

  window.addEventListener("pointerdown", boost, { capture: true, passive: true, once: true });
  window.addEventListener("click", boost, { capture: true, passive: true, once: true });
}
