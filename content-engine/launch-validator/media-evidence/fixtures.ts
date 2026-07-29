/**
 * Intentionally broken / gold fixture generators for evidence certification tests.
 * Uses PIL for text overlays (Homebrew ffmpeg may lack drawtext/libfreetype).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBrandAssetPath } from "../../brand/assets-resolver.js";

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Render a vertical PNG card with text via Python PIL. */
function writeTextCardPy(
  path: string,
  lines: string[],
  options?: { bg?: string; width?: number; height?: number },
): void {
  const width = options?.width ?? 1080;
  const height = options?.height ?? 1920;
  const bg = options?.bg ?? "#224466";
  const script = `
from PIL import Image, ImageDraw, ImageFont
img = Image.new("RGB", (${width}, ${height}), "${bg}")
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 44)
except Exception:
    font = ImageFont.load_default()
y = int(${height} * 0.2)
for line in ${JSON.stringify(lines)}:
    bbox = draw.textbbox((0, 0), line, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((${width} - tw) // 2, y), line, fill="white", font=font)
    y += 70
img.save(${JSON.stringify(path)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

/** Silent vertical short — must FAIL audio gates. */
export function makeSilentVerticalMp4(dir: string, seconds = 16): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "silent.mp4");
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=0x332266:s=1080x1920:d=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    `anullsrc=channel_layout=stereo:sample_rate=48000:duration=${seconds}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    path,
  ]);
  return path;
}

/** Wrong aspect ratio — must FAIL visual/performance. */
export function makeLandscapeMp4(dir: string, seconds = 16): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "landscape.mp4");
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    `color=c=blue:s=1920x1080:d=${seconds}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    path,
  ]);
  return path;
}

/** Black frames dominant — must FAIL visual quality. */
export function makeBlackFrameMp4(dir: string, seconds = 16): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "black.mp4");
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=1080x1920:d=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=220:duration=${seconds}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    path,
  ]);
  return path;
}

/** Corrupt / non-media bytes named .mp4 — must FAIL / INCONCLUSIVE. */
export function makeCorruptMp4(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "corrupt.mp4");
  writeFileSync(path, Buffer.from("NOT_AN_MP4_FILE"));
  return path;
}

/**
 * Audio-present vertical video with burned-in text but NO end-card badges —
 * must FAIL end_card.
 */
export function makeNoEndCardMp4(dir: string, seconds = 16): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "no-endcard.mp4");
  const card = join(dir, "card.png");
  writeTextCardPy(card, ["Parents struggle today", "AmyNest helps habits"], {
    bg: "#224466",
  });
  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(seconds),
    "-i",
    card,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=330:duration=${seconds}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    path,
  ]);
  return path;
}

/**
 * Near-gold fixture: Amy bible frames + audio bed + end-card CTA/badge text.
 */
export function makeGoldMarketingMp4(dir: string, seconds = 18): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "gold.mp4");
  const girl = resolveBrandAssetPath("amyGirlBible");
  const icon = resolveBrandAssetPath("appIcon");
  if (!existsSync(girl) || !existsSync(icon)) {
    throw new Error("Brand bible/icon assets required for gold fixture");
  }

  const bodyCard = join(dir, "body-card.png");
  const endCard = join(dir, "end-card.png");
  writeTextCardPy(
    bodyCard,
    [
      "Parents feel the worksheet panic today",
      "AmyNest guides calmer habits",
      "Hope before the download",
    ],
    { bg: "#2B1E5E" },
  );
  writeTextCardPy(
    endCard,
    ["Download AmyNest AI", "Google Play", "App Store", "amynest.in"],
    { bg: "#461EA8" },
  );

  const body = join(dir, "body.mp4");
  const end = join(dir, "end.mp4");
  const narr = join(dir, "narr.wav");
  const music = join(dir, "music.wav");

  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=180:duration=${seconds}:sample_rate=48000`,
    narr,
  ]);
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=90:duration=${seconds}:sample_rate=48000`,
    music,
  ]);

  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(seconds - 3),
    "-i",
    girl,
    "-loop",
    "1",
    "-t",
    String(seconds - 3),
    "-i",
    bodyCard,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[base];[1:v]scale=1080:1920,format=rgba,colorchannelmixer=aa=0.55[txt];[base][txt]overlay=0:0,format=yuv420p[v]",
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    body,
  ]);

  ffmpeg([
    "-loop",
    "1",
    "-t",
    "3",
    "-i",
    endCard,
    "-loop",
    "1",
    "-t",
    "3",
    "-i",
    icon,
    "-filter_complex",
    "[0:v]scale=1080:1920,setsar=1[bg];[1:v]scale=320:-1[ic];[bg][ic]overlay=(W-w)/2:(H-h)/2-200,format=yuv420p[v]",
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    end,
  ]);

  const list = join(dir, "concat.txt");
  writeFileSync(list, `file '${body}'\nfile '${end}'\n`);

  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-i",
    narr,
    "-i",
    music,
    "-filter_complex",
    "[1:a]volume=1.0[n];[2:a]volume=0.25[m];[n][m]amix=inputs=2:duration=first[a]",
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-t",
    String(seconds),
    path,
  ]);

  return path;
}
