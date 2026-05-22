import type { StaticAudioMode } from "@workspace/static-audio/browser";

export type AmyVoiceVisualFallbackDetail = {
  phrase?: string;
  mode?: StaticAudioMode;
  highlightWords?: string[];
  showTapToHear?: boolean;
  animated?: boolean;
};

/** Layer 5 — always-on text/visual feedback when audio layers fail. */
export function emitAmyVoiceTextFallback(detail: AmyVoiceVisualFallbackDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("amynest-static-audio-fallback", {
      detail: {
        ...detail,
        showTapToHear: detail.showTapToHear ?? true,
        animated: detail.animated ?? true,
      },
    }),
  );
  window.dispatchEvent(
    new CustomEvent("amynest-amy-voice-text-fallback", {
      detail,
    }),
  );
}

export function onAmyVoiceTextFallback(
  handler: (detail: AmyVoiceVisualFallbackDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<AmyVoiceVisualFallbackDetail>).detail ?? {});
  };
  window.addEventListener("amynest-amy-voice-text-fallback", listener);
  return () => window.removeEventListener("amynest-amy-voice-text-fallback", listener);
}
