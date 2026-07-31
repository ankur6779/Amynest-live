/**
 * Last-frame freeze — extract canonical memory frame from a generated clip.
 * Local ffmpeg only — no extra provider API calls.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Freeze a representative end frame from a generated scene video.
 * Uses a frame slightly before the absolute end to avoid fade-to-black artifacts.
 */
export function freezeLastFrame(input: {
  videoPath: string;
  outputPath: string;
  /** Seconds before end to sample (default 0.12). */
  offsetFromEndSeconds?: number;
}): string {
  if (!existsSync(input.videoPath)) {
    throw new Error(`Cannot freeze last frame — video missing: ${input.videoPath}`);
  }
  mkdirSync(dirname(input.outputPath), { recursive: true });
  const offset = input.offsetFromEndSeconds ?? 0.12;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-sseof",
      `-${offset}`,
      "-i",
      input.videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      input.outputPath,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (!existsSync(input.outputPath)) {
    throw new Error(`Last-frame freeze failed: ${input.outputPath}`);
  }
  return input.outputPath;
}
