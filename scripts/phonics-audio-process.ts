/**
 * Phonics MP3 mastering — trim → loudnorm → limiter → micro-fades (order fixed).
 * Build-time only; ensures consistent loudness across all phoneme clips.
 */
import { execFile } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  estimateMp3DurationMs,
  PHONICS_MASTERING_FILTER_CHAIN,
  PHONICS_MIN_MP3_BYTES,
  PHONICS_OUTPUT_CHANNELS,
  PHONICS_OUTPUT_SAMPLE_RATE,
  validatePhonicsMp3Buffer,
  validatePostNormalizationDuration,
} from "@workspace/phonics-sounds";

const execFileAsync = promisify(execFile);

let ffmpegAvailable: boolean | null = null;

export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

async function runFfmpegMastering(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-af",
    PHONICS_MASTERING_FILTER_CHAIN,
    "-ar",
    String(PHONICS_OUTPUT_SAMPLE_RATE),
    "-ac",
    String(PHONICS_OUTPUT_CHANNELS),
    // Explicit CBR 128k: lame's mono default (~64k) halved the size-based
    // duration estimate and let overlong clips slip past the 900ms gate.
    "-b:a",
    "128k",
    outputPath,
  ]);

  if (!existsSync(outputPath) || readFileSync(outputPath).byteLength < PHONICS_MIN_MP3_BYTES) {
    throw new Error("ffmpeg mastering produced invalid output");
  }
}

function assertPostNormalization(buffer: Buffer, audioKey?: string): void {
  const durationMs = estimateMp3DurationMs(buffer.byteLength);
  const post = validatePostNormalizationDuration(durationMs);
  if (!post.ok) {
    throw new Error(`${audioKey ?? "clip"}: ${post.reason} (~${durationMs}ms)`);
  }
  const validation = validatePhonicsMp3Buffer(buffer, audioKey);
  if (!validation.ok) {
    throw new Error(`${audioKey ?? "clip"}: ${validation.reason}`);
  }
}

/** Master an in-memory MP3 buffer (used during ElevenLabs generation). */
export async function processPhonemeAudioBuffer(
  buffer: Buffer,
  audioKey?: string,
): Promise<Buffer> {
  const dir = mkdtempSync(join(tmpdir(), "phonics-audio-"));
  const inputPath = join(dir, "in.mp3");
  const outputPath = join(dir, "out.mp3");

  try {
    writeFileSync(inputPath, buffer);
    await runFfmpegMastering(inputPath, outputPath);
    const mastered = readFileSync(outputPath);
    assertPostNormalization(mastered, audioKey);
    return mastered;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Phase H — normalize ANY phonics clip (words, sentences, stories) to the same
 * loudness / sample-rate / channel / silence profile as phonemes, WITHOUT the
 * phoneme-only 250–900ms duration assertion. Optional mode-aware bounds.
 */
export async function normalizePhonicsAudioBuffer(
  buffer: Buffer,
  opts?: { durationBounds?: { min: number; max: number }; label?: string },
): Promise<Buffer> {
  const dir = mkdtempSync(join(tmpdir(), "phonics-norm-"));
  const inputPath = join(dir, "in.mp3");
  const outputPath = join(dir, "out.mp3");
  try {
    writeFileSync(inputPath, buffer);
    await runFfmpegMastering(inputPath, outputPath);
    const mastered = readFileSync(outputPath);
    if (mastered.byteLength < PHONICS_MIN_MP3_BYTES) {
      throw new Error(`${opts?.label ?? "clip"}: normalization produced invalid output`);
    }
    const bounds = opts?.durationBounds;
    if (bounds) {
      const durationMs = estimateMp3DurationMs(mastered.byteLength);
      if (durationMs < bounds.min || durationMs > bounds.max) {
        throw new Error(
          `${opts?.label ?? "clip"}: duration ${durationMs}ms outside [${bounds.min}, ${bounds.max}]`,
        );
      }
    }
    return mastered;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Master a file in place (batch normalization). */
export async function processPhonemeAudioFile(
  filePath: string,
  audioKey?: string,
): Promise<{ durationMs: number; size: number }> {
  const dir = dirname(filePath);
  const base = basename(filePath, ".mp3");
  const finalTmp = join(dir, `${base}.master.mp3`);

  try {
    await runFfmpegMastering(filePath, finalTmp);

    const mastered = readFileSync(finalTmp);
    assertPostNormalization(mastered, audioKey ?? base);

    writeFileSync(filePath, mastered);
    return {
      durationMs: estimateMp3DurationMs(mastered.byteLength),
      size: mastered.byteLength,
    };
  } finally {
    if (existsSync(finalTmp)) {
      try {
        unlinkSync(finalTmp);
      } catch {
        /* ignore */
      }
    }
  }
}

/** @deprecated Use processPhonemeAudioBuffer — trim-only step is now full mastering pipeline. */
export async function trimPhonicsMp3Silence(buffer: Buffer): Promise<Buffer> {
  return processPhonemeAudioBuffer(buffer);
}
