import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";

export type SpellingAudioTelemetryEvent =
  | "audio_play"
  | "audio_complete"
  | "audio_error";

const missingReported = new Set<string>();

export function trackSpellingAudioEvent(
  event: SpellingAudioTelemetryEvent,
  payload: Record<string, unknown>,
): void {
  logAmyVoiceDiag(`spelling_${event}`, payload);
}

export function reportSpellingAudioMissing(key: string, context?: string): void {
  if (missingReported.has(key)) return;
  missingReported.add(key);
  trackSpellingAudioEvent("audio_error", {
    reason: "missing_manifest_entry",
    key,
    context,
  });
}
