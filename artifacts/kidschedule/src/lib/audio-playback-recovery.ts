/**
 * Temporary playback recovery — trust audio.play() after load; no audible gate / force restart.
 * Remove or set AUDIO_PLAYBACK_RECOVERY_MODE = false when root cause is fixed.
 */
export const AUDIO_PLAYBACK_RECOVERY_MODE = true;

/** Skip OpenAI / ElevenLabs when static catalog has a URL for this phrase. */
export const SKIP_LIVE_TTS_WHEN_STATIC_EXISTS = true;

export function isAudioPlaybackRecoveryMode(): boolean {
  return AUDIO_PLAYBACK_RECOVERY_MODE;
}

export function shouldSkipLiveTtsWhenStaticExists(): boolean {
  return SKIP_LIVE_TTS_WHEN_STATIC_EXISTS;
}

export function logPlaybackElementState(
  label: string,
  audio: HTMLAudioElement,
): void {
  console.warn("[AudioPlaybackRecovery]", label, {
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration: audio.duration,
    muted: audio.muted,
    volume: audio.volume,
    readyState: audio.readyState,
    networkState: audio.networkState,
  });
}

/** Log at play start and again after 1s to verify currentTime advancement. */
export function schedulePlaybackProgressCheck(
  audio: HTMLAudioElement,
  label: string,
): void {
  logPlaybackElementState(`${label}:start`, audio);
  window.setTimeout(() => {
    logPlaybackElementState(`${label}:+1000ms`, audio);
    if (audio.currentTime > 0) {
      console.warn("[AudioPlaybackRecovery] playback_progress_ok", {
        label,
        currentTime: audio.currentTime,
      });
    }
  }, 1000);
}
