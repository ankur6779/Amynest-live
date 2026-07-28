import { spawn } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { TEST_VEO_TARGET_DURATION_SECONDS } from "./scene.js";

export interface VideoValidationResult {
  ok: boolean;
  exists: boolean;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  verticalCompatible: boolean;
  corrupt: boolean;
  emptyFramesSuspected: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateGeneratedVideo(
  videoPath: string,
  options: {
    targetDurationSeconds?: number;
    durationToleranceSeconds?: number;
    ffprobePath?: string;
  } = {},
): Promise<VideoValidationResult> {
  const target = options.targetDurationSeconds ?? TEST_VEO_TARGET_DURATION_SECONDS;
  const tolerance = options.durationToleranceSeconds ?? 1.75;
  const errors: string[] = [];
  const warnings: string[] = [];

  let exists = false;
  let fileSizeBytes = 0;
  try {
    await access(videoPath);
    exists = true;
    fileSizeBytes = (await stat(videoPath)).size;
  } catch {
    errors.push(`Video file missing: ${videoPath}`);
  }

  if (exists && fileSizeBytes < 8_192) {
    errors.push(`Video file too small (${fileSizeBytes} bytes) — likely corrupt/empty`);
  }

  let durationSeconds: number | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let fps: number | null = null;
  let corrupt = false;

  if (exists) {
    try {
      const probed = await ffprobeVideo(videoPath, options.ffprobePath ?? "ffprobe");
      durationSeconds = probed.durationSeconds;
      width = probed.width;
      height = probed.height;
      fps = probed.fps;
    } catch (error) {
      corrupt = true;
      errors.push(
        `ffprobe failed — file may be corrupt: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (durationSeconds != null) {
    if (Math.abs(durationSeconds - target) > tolerance) {
      warnings.push(
        `Duration ${durationSeconds.toFixed(2)}s outside target ${target}s ±${tolerance}s`,
      );
    }
    if (durationSeconds < 1) {
      errors.push("Duration under 1s — empty/invalid media");
    }
  } else if (exists && !corrupt) {
    warnings.push("Could not determine duration");
  }

  const verticalCompatible =
    width != null && height != null ? height >= width : false;
  if (exists && width != null && height != null && !verticalCompatible) {
    warnings.push(
      `Not vertical (${width}x${height}); Shorts pipeline can pad/scale to 9:16`,
    );
  }

  const emptyFramesSuspected =
    exists && fileSizeBytes > 0 && fileSizeBytes < 40_000 && (durationSeconds ?? 0) >= 4;
  if (emptyFramesSuspected) {
    warnings.push("Suspiciously small bitrate for duration — possible empty frames");
  }

  return {
    ok: errors.length === 0 && exists && !corrupt,
    exists,
    fileSizeBytes,
    durationSeconds,
    width,
    height,
    fps,
    verticalCompatible,
    corrupt,
    emptyFramesSuspected,
    errors,
    warnings,
  };
}

async function ffprobeVideo(
  videoPath: string,
  ffprobePath: string,
): Promise<{
  durationSeconds: number;
  width: number | null;
  height: number | null;
  fps: number | null;
}> {
  const args = [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate:format=duration",
    "-of",
    "json",
    videoPath,
  ];
  const stdout = await runCommand(ffprobePath, args);
  const payload = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number; r_frame_rate?: string }>;
    format?: { duration?: string };
  };
  const stream = payload.streams?.[0];
  const durationSeconds = Number(payload.format?.duration ?? "0");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Invalid duration from ffprobe");
  }
  return {
    durationSeconds,
    width: stream?.width ?? null,
    height: stream?.height ?? null,
    fps: parseFrameRate(stream?.r_frame_rate),
  };
}

function parseFrameRate(value?: string): number | null {
  if (!value) return null;
  const [a, b] = value.split("/").map(Number);
  if (!a || !b) return Number.isFinite(a) ? a : null;
  return a / b;
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${command} exited ${code}`));
    });
  });
}
