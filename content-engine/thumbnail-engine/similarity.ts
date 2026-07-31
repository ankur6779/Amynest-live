/**
 * First-frame similarity — thumbnail design vs video opening frame.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Score 0–100 how closely the video's first frame matches the thumbnail still.
 * Uses downscaled RGB mean absolute difference (local only — no API cost).
 */
export function scoreFirstFrameSimilarity(input: {
  videoPath: string;
  thumbnailPath: string;
  workDir: string;
}): number {
  if (!existsSync(input.videoPath) || !existsSync(input.thumbnailPath)) {
    return 0;
  }
  mkdirSync(input.workDir, { recursive: true });
  const framePath = join(input.workDir, "video-first-frame.png");

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        "0.05",
        "-i",
        input.videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        framePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 },
    );
  } catch {
    return 0;
  }

  try {
    const out = execFileSync(
      "python3",
      [
        "-c",
        `
from PIL import Image
import numpy as np
a = np.asarray(Image.open(${JSON.stringify(input.thumbnailPath)}).convert("RGB").resize((160, 90), Image.Resampling.LANCZOS), dtype=np.float32)
b = np.asarray(Image.open(${JSON.stringify(framePath)}).convert("RGB").resize((160, 90), Image.Resampling.LANCZOS), dtype=np.float32)
mad = float(np.mean(np.abs(a - b)))
# 0 MAD → 100; ~80+ MAD → ~0
score = max(0.0, min(100.0, 100.0 - mad * 1.15))
print(f"{score:.1f}")
`,
      ],
      { encoding: "utf8" },
    ).trim();
    return Math.round(Number(out));
  } catch {
    return 0;
  }
}
