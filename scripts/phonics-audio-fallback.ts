/**
 * Build-time fallback phoneme tone — short click/beep when ElevenLabs fails.
 * Never leave a catalog key without a playable asset.
 */
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  estimateMp3DurationMs,
  PHONICS_STOP_SOUND_KEYS,
} from "@workspace/phonics-sounds";

const execFileAsync = promisify(execFile);

/** ~320ms tone — passes min playable length (250ms). */
const FALLBACK_DURATION_SEC = 0.32;

const STOP_TONE_HZ: Record<string, number> = {
  b: 440,
  c: 523,
  d: 494,
  p: 587,
  t: 659,
  k: 523,
};

function toneFrequencyForKey(audioKey: string): number {
  const key = audioKey.trim().toLowerCase();
  if (STOP_TONE_HZ[key]) return STOP_TONE_HZ[key]!;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * 31) % 180;
  }
  return 320 + hash;
}

/**
 * Generate a short MP3 click/beep via ffmpeg (no ElevenLabs).
 * Distinct frequency per key for dev identification.
 */
export async function generateFallbackToneMp3(audioKey: string): Promise<Buffer> {
  const hz = toneFrequencyForKey(audioKey);
  const dir = mkdtempSync(join(tmpdir(), "phonics-fallback-"));
  const outputPath = join(dir, "tone.mp3");

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${hz}:duration=${FALLBACK_DURATION_SEC}`,
      "-af",
      "afade=t=in:st=0:d=0.01,afade=t=out:st=0.27:d=0.05",
      "-b:a",
      "128k",
      outputPath,
    ]);
    return readFileSync(outputPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function isStopSoundKey(audioKey: string): boolean {
  return (PHONICS_STOP_SOUND_KEYS as readonly string[]).includes(audioKey.trim().toLowerCase());
}

export function describeFallbackTone(audioKey: string): string {
  return `fallback_tone_${toneFrequencyForKey(audioKey)}hz_${Math.round(FALLBACK_DURATION_SEC * 1000)}ms`;
}

export function estimateFallbackDurationMs(buffer: Buffer): number {
  return estimateMp3DurationMs(buffer.byteLength);
}
