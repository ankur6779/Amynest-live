/**
 * FFmpeg loudness / silence constants for phonics clip mastering.
 */
export const PHONICS_FFMPEG_SILENCE_FILTER = "silenceremove=1:0:-40dB";
/** Speech target — consistent perceived loudness across all phonemes. */
export const PHONICS_LOUDNORM_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=11";
export const PHONICS_LIMITER_FILTER = "alimiter=limit=-1.5dB";
/** Micro-fades — reduce click/pop on stop sounds (t, p, k) and clip edges. */
export const PHONICS_FADE_IN_FILTER = "afade=t=in:st=0:d=0.02";
export const PHONICS_FADE_OUT_MS = 0.03;
/**
 * Tail fade for variable-length clips — reverse/in/reverse because afade t=out st=0
 * would fade from the file start, not the end.
 */
export const PHONICS_FADE_OUT_FILTER = `areverse,afade=t=in:st=0:d=${PHONICS_FADE_OUT_MS},areverse`;

/** Standard output format for consistent playback on iOS, Android, and browsers. */
export const PHONICS_OUTPUT_SAMPLE_RATE = 44100;
export const PHONICS_OUTPUT_CHANNELS = 1;

/** Full mastering chain — filter order is fixed. */
export const PHONICS_MASTERING_FILTER_CHAIN = [
  PHONICS_FFMPEG_SILENCE_FILTER,
  PHONICS_LOUDNORM_FILTER,
  PHONICS_LIMITER_FILTER,
  PHONICS_FADE_IN_FILTER,
  PHONICS_FADE_OUT_FILTER,
].join(",");

/** Post-mastering duration bounds (ms). */
export const PHONICS_POST_NORM_MIN_MS = 250;
export const PHONICS_POST_NORM_MAX_MS = 900;

export function validatePostNormalizationDuration(durationMs: number): {
  ok: boolean;
  reason?: string;
} {
  if (durationMs < PHONICS_POST_NORM_MIN_MS) {
    return { ok: false, reason: "too_short_after_processing" };
  }
  if (durationMs > PHONICS_POST_NORM_MAX_MS) {
    return { ok: false, reason: "too_long_after_processing" };
  }
  return { ok: true };
}
