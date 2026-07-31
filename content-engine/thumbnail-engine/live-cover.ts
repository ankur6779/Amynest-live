/**
 * Live cover — thumbnail composition as a subtle living 1.5–2s open.
 * Local ffmpeg only (zoom / breath / particles) — no extra provider API calls.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * Build an alive cover clip that matches the thumbnail design, then optionally
 * prepend it so Shorts auto-thumbs look like an animated movie open.
 */
export function applyLiveThumbnailCover(input: {
  videoPath: string;
  coverStillPath: string;
  outputDir: string;
  coverSeconds?: number;
  prependToVideo?: boolean;
}): {
  coverClipPath: string;
  outputVideoPath: string;
  coverApplied: boolean;
  liveCover: boolean;
} {
  mkdirSync(input.outputDir, { recursive: true });
  if (!existsSync(input.videoPath)) {
    throw new Error(`Live cover missing video: ${input.videoPath}`);
  }
  if (!existsSync(input.coverStillPath)) {
    throw new Error(`Live cover missing still: ${input.coverStillPath}`);
  }

  const seconds = Math.min(2, Math.max(1.5, input.coverSeconds ?? 1.75));
  const frames = Math.round(seconds * 30);
  const coverClipPath = join(input.outputDir, "thumbnail-cover.mp4");
  const outputVideoPath = join(input.outputDir, "video-with-thumbnail-cover.mp4");
  const particlesPath = join(input.outputDir, "live-cover-particles.png");

  // Soft particle plate (animated via overlay scroll)
  execFileSync(
    "python3",
    [
      "-c",
      `
from PIL import Image, ImageDraw
import numpy as np
W,H=1080,1920
im=Image.new("RGBA",(W,H),(0,0,0,0))
d=ImageDraw.Draw(im)
rng=np.random.default_rng(7)
for _ in range(60):
    x=int(rng.integers(20,W-20)); y=int(rng.integers(80,H-80))
    r=int(rng.integers(2,7))
    d.ellipse((x-r,y-r,x+r,y+r), fill=(201,182,255,int(rng.integers(50,110))))
im.save(${JSON.stringify(particlesPath)})
`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const probe = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0:s=x",
      input.videoPath,
    ],
    { encoding: "utf8" },
  ).trim();
  const [iw, ih] = probe.split("x").map((n) => Number(n));
  const width = iw || 1080;
  const height = ih || 1920;

  // Live open: slow push-in + tiny vertical breath + floating particles
  // Feels like animated film, not a frozen slideshow plate.
  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `zoompan=z='min(1.06,1+0.03*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+4*sin(on/12)':d=${frames}:s=${width}x${height}:fps=30`,
    "format=yuv420p",
  ].join(",");

  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(seconds),
    "-i",
    input.coverStillPath,
    "-loop",
    "1",
    "-t",
    String(seconds),
    "-i",
    particlesPath,
    "-filter_complex",
    `[0:v]${vf}[base];[1:v]scale=${width}:${height},format=rgba,colorchannelmixer=aa=0.55,crop=${width}:${height}:0:'min(80,20*t)'[p];[base][p]overlay=0:0:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(seconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    coverClipPath,
  ]);

  const prepend = input.prependToVideo !== false;
  if (!prepend) {
    return {
      coverClipPath,
      outputVideoPath: input.videoPath,
      coverApplied: false,
      liveCover: true,
    };
  }

  const bodyNorm = join(input.outputDir, "body-norm-for-cover.mp4");
  ffmpeg([
    "-i",
    input.videoPath,
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    bodyNorm,
  ]);

  const list = join(input.outputDir, "thumbnail-cover-concat.txt");
  writeFileSync(
    list,
    `file '${coverClipPath.replace(/'/g, "'\\''")}'\nfile '${bodyNorm.replace(/'/g, "'\\''")}'\n`,
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputVideoPath,
  ]);

  return {
    coverClipPath,
    outputVideoPath,
    coverApplied: true,
    liveCover: true,
  };
}
