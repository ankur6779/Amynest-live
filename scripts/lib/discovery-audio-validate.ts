/**
 * Shared MP3 validation for discovery-worlds audio QA and generation.
 */
import { validateAnimalWorldMp3Buffer } from "@workspace/animal-world";

export type ClipValidationResult = {
  ok: boolean;
  decodable: boolean;
  nonEmpty: boolean;
  durationMs: number;
  expectedMs: number;
  durationOk: boolean;
  likelySilent: boolean;
  likelyClipping: boolean;
  likelyCorrupt: boolean;
  reason?: string;
};

export function isLikelySilent(buf: Buffer, durationMs: number): boolean {
  if (buf.length < 400) return true;
  return durationMs > 0 && durationMs < 400;
}

/** Heuristic: abnormal density of 0xFF sync-adjacent bytes in frame region. */
export function isLikelyClipping(buf: Buffer): boolean {
  const start = Math.min(1024, Math.floor(buf.length * 0.1));
  const end = Math.min(buf.length, start + 8192);
  let ff = 0;
  let samples = 0;
  for (let i = start; i < end; i++) {
    samples += 1;
    if (buf[i] === 0xff) ff += 1;
  }
  return samples > 0 && ff / samples > 0.35;
}

export function validateDiscoveryClip(buf: Buffer, expectedDurationSec: number): ClipValidationResult {
  const validation = validateAnimalWorldMp3Buffer(new Uint8Array(buf));
  const durationMs = validation.estimatedDurationMs;
  const expectedMs = expectedDurationSec * 1000;
  const decodable = validation.ok;
  const nonEmpty = buf.length >= 800;
  const durationOk =
    durationMs <= 0 ||
    Math.abs(durationMs - expectedMs) <= expectedMs * 0.6 + 2000;
  const likelySilent = isLikelySilent(buf, durationMs);
  const likelyClipping = isLikelyClipping(buf);
  const likelyCorrupt = !decodable;

  const ok = decodable && nonEmpty && !likelyCorrupt && !likelySilent && durationOk;

  return {
    ok,
    decodable,
    nonEmpty,
    durationMs,
    expectedMs,
    durationOk,
    likelySilent,
    likelyClipping,
    likelyCorrupt,
    reason: validation.reason,
  };
}

export function isNarrationPath(gcsPath: string): boolean {
  return /narration-(intro|sound)\.mp3$/i.test(gcsPath);
}

export function isSoundEffectPath(gcsPath: string): boolean {
  return !isNarrationPath(gcsPath);
}
