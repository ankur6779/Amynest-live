/**
 * HTMLAudioElement started playing and is not muted.
 * currentTime can stay 0 while MPEG decode catches up after a successful play().
 */
export function isHtmlAudioAudiblyStarted(audio: HTMLAudioElement): boolean {
  if (audio.muted) return false;
  if (audio.volume <= 0) return false;
  if (audio.paused) return false;
  if (audio.currentTime > 0.02) return true;
  if (audio.readyState >= 2) return true;
  const dur = audio.duration;
  if (dur === Infinity) return audio.readyState >= 2 || audio.currentTime > 0;
  return false;
}
