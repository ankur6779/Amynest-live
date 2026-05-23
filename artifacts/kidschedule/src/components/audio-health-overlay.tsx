import { useEffect, useState } from "react";
import {
  getLastAudioHealthEvent,
  subscribeAudioHealthOverlay,
  type AudioHealthEvent,
} from "@/lib/audio-health";
import { isAmyVoiceAudioDebugEnabled } from "@/lib/amy-voice-audio-diag";

export function AudioHealthOverlay() {
  const [event, setEvent] = useState<AudioHealthEvent | null>(() => getLastAudioHealthEvent());

  useEffect(() => {
    if (!isAmyVoiceAudioDebugEnabled()) return;
    return subscribeAudioHealthOverlay(setEvent);
  }, []);

  if (!isAmyVoiceAudioDebugEnabled() || !event) return null;

  const statusColor =
    event.event === "audio_failure"
      ? "text-red-300"
      : event.event === "audio_fallback"
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <div className="fixed bottom-20 right-3 z-[9999] max-w-[240px] rounded-xl border border-white/15 bg-black/80 backdrop-blur px-3 py-2 text-[11px] font-mono text-white shadow-lg pointer-events-none">
      <p className="font-bold text-primary/80 mb-1">Audio Health</p>
      <p className={statusColor}>{event.event}</p>
      <p>module: {event.module}</p>
      {event.layer && <p>layer: {event.layer}</p>}
      {event.ttfaMs != null && <p>ttfa: {event.ttfaMs}ms</p>}
      {event.fallbackUsed && <p className="text-amber-300">fallback: yes</p>}
      {event.errorType && <p className="text-red-300">error: {event.errorType}</p>}
    </div>
  );
}
