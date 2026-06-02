const MIN_BYTES = 800;
const MAX_DURATION_MS = 32_000;

/** Rough MP3 duration from byte size (128kbps CBR estimate). */
export function estimateMp3DurationMs(byteLength: number): number {
  return Math.round((byteLength * 8) / 128);
}

export type AnimalMp3Validation = {
  ok: boolean;
  byteLength: number;
  estimatedDurationMs: number;
  reason?: string;
};

/** Animal clips may be up to ~30s — do not use phonics phoneme limits. */
export function validateAnimalWorldMp3Buffer(buffer: Uint8Array): AnimalMp3Validation {
  const byteLength = buffer.byteLength;
  const estimatedDurationMs = estimateMp3DurationMs(byteLength);

  if (byteLength < MIN_BYTES) {
    return { ok: false, byteLength, estimatedDurationMs, reason: `too_small (${byteLength} bytes)` };
  }
  if (estimatedDurationMs > MAX_DURATION_MS) {
    return {
      ok: false,
      byteLength,
      estimatedDurationMs,
      reason: `too_long (~${estimatedDurationMs}ms)`,
    };
  }
  return { ok: true, byteLength, estimatedDurationMs };
}
