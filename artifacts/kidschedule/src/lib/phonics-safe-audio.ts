/**
 * Safe HTMLAudioElement factory for phonics playback — never throws.
 */
import { isPhonicsLibraryGcsUrl } from "@/lib/static-audio-guard";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

export type CreateSafeAudioMeta = {
  catalogKey?: string;
  label?: string;
};

function isAllowedPhonicsPlaybackUrl(url: string): boolean {
  if (url.startsWith("blob:")) return true;
  if (url.startsWith("/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("storage.googleapis.com") && !isPhonicsLibraryGcsUrl(url)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Create a playback element for phonics — returns null instead of throwing.
 * Blocks non-phonics GCS URLs (static catalog must use /api/static-audio/).
 */
export function createSafeAudio(
  url: string,
  meta: CreateSafeAudioMeta = {},
): HTMLAudioElement | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;

  if (!isAllowedPhonicsPlaybackUrl(trimmed)) {
    recordPhonicsTelemetry("phonics_audio_url_blocked", {
      catalogKey: meta.catalogKey,
      label: meta.label,
      url: trimmed.slice(0, 200),
    });
    if (import.meta.env.DEV) {
      console.warn("[phonics-safe-audio] blocked URL", trimmed.slice(0, 120));
    }
    return null;
  }

  try {
    const audio = new Audio(trimmed);
    if (!audio) return null;
    return audio;
  } catch (err) {
    recordPhonicsTelemetry("phonics_audio_play_failed", {
      catalogKey: meta.catalogKey,
      label: meta.label,
      url: trimmed.slice(0, 200),
      reason: err instanceof Error ? err.message : "create_safe_audio_failed",
    });
    if (import.meta.env.DEV) {
      console.warn("[phonics-safe-audio] create failed", err);
    }
    return null;
  }
}
