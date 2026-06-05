import { useEffect, useState } from "react";
import { VolumeX } from "lucide-react";
import { subscribeVoiceUnavailable } from "@/lib/audio-boot-orchestrator";

const HINT_COPY =
  "Voice features are temporarily unavailable. AmyNest will retry automatically.";

/**
 * Small, non-blocking hint when background audio init has exhausted retries.
 * Never shown during the startup grace window.
 */
export function AudioVoiceStatusHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    return subscribeVoiceUnavailable((unavailable) => {
      setShow(unavailable);
    });
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto flex max-w-md items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/85 px-3 py-2 text-xs text-amber-50 shadow-md backdrop-blur-sm sm:left-auto sm:right-4"
    >
      <VolumeX className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <p className="leading-snug">{HINT_COPY}</p>
    </div>
  );
}
