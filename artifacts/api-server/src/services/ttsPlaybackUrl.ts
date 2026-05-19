/** Stable API-relative URL for TTS playback (never expose raw GCS to clients). */
export function resolveTtsPlaybackUrl(
  cacheKey: string,
  _row?: { audioUrl?: string | null },
): string {
  return `/api/tts/audio/${cacheKey}.mp3`;
}
