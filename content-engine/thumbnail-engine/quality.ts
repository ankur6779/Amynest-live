/**
 * Thumbnail quality gate — must read on a ~120px mobile preview.
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import type { ThumbnailQualityResult, ThumbnailRejectCode } from "./types.js";

export function gateThumbnailQuality(input: {
  jpgPath: string;
  headline: string;
}): ThumbnailQualityResult {
  const rejects: Array<{ code: ThumbnailRejectCode; reason: string }> = [];

  if (!existsSync(input.jpgPath)) {
    return {
      ok: false,
      score: 0,
      rejects: [{ code: "wrong-dimensions", reason: "thumbnail.jpg missing" }],
      summary: "Thumbnail missing",
    };
  }

  const size = statSync(input.jpgPath).size;
  if (size >= 2 * 1024 * 1024) {
    rejects.push({
      code: "oversize",
      reason: `JPEG is ${(size / (1024 * 1024)).toFixed(2)} MB (≥ 2 MB)`,
    });
  }

  const words = input.headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) {
    rejects.push({
      code: "tiny-text",
      reason: `Headline must be 1–4 words (got ${words.length})`,
    });
  }

  // Probe dimensions + downscale contrast/luminance via Python
  try {
    const probe = execFileSync(
      "python3",
      [
        "-c",
        `
from PIL import Image, ImageStat, ImageFilter
import json
im = Image.open(${JSON.stringify(input.jpgPath)}).convert("RGB")
w, h = im.size
# Simulate ~120px-wide mobile preview readability
preview = im.resize((120, max(1, int(120 * h / w))), Image.Resampling.LANCZOS)
stat = ImageStat.Stat(preview)
# Contrast proxy: stddev of luminance
gray = preview.convert("L")
gstat = ImageStat.Stat(gray)
contrast = sum(gstat.stddev) / max(1, len(gstat.stddev))
# Edge energy as sharpness proxy on face band (center)
cx0, cy0, cx1, cy1 = int(w*0.25), int(h*0.25), int(w*0.75), int(h*0.85)
face = im.crop((cx0, cy0, cx1, cy1)).convert("L").filter(ImageFilter.FIND_EDGES)
fstat = ImageStat.Stat(face)
edge = sum(fstat.mean) / max(1, len(fstat.mean))
print(json.dumps({"w": w, "h": h, "contrast": contrast, "edge": edge}))
`,
      ],
      { encoding: "utf8" },
    ).trim();
    const meta = JSON.parse(probe) as {
      w: number;
      h: number;
      contrast: number;
      edge: number;
    };
    if (meta.w !== 1280 || meta.h !== 720) {
      rejects.push({
        code: "wrong-dimensions",
        reason: `Expected 1280×720, got ${meta.w}×${meta.h}`,
      });
    }
    if (meta.contrast < 28) {
      rejects.push({
        code: "low-contrast",
        reason: `Low mobile-preview contrast (${meta.contrast.toFixed(1)})`,
      });
    }
    if (meta.edge < 8) {
      rejects.push({
        code: "blurry-faces",
        reason: `Low face-band edge energy (${meta.edge.toFixed(1)}) — faces may be soft`,
      });
    }
  } catch (err) {
    rejects.push({
      code: "busy-background",
      reason: `Quality probe failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const score = Math.max(0, 100 - rejects.length * 20);
  const ok = rejects.length === 0 && score >= 80;
  return {
    ok,
    score,
    rejects,
    summary: ok
      ? `Thumbnail quality PASS (score ${score}) — readable at ~120px preview.`
      : `Thumbnail quality REJECT: ${rejects.map((r) => r.code).join(", ")}`,
  };
}
