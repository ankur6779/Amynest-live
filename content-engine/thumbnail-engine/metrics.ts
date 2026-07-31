/**
 * Thumbnail intelligence metrics — face, eyes, readability, safe areas, chrome.
 * Local image analysis only (no extra provider API calls).
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ThumbnailMetrics } from "./types.js";

export function measureThumbnailMetrics(input: {
  jpgPath: string;
  headline: string;
}): ThumbnailMetrics {
  const empty: ThumbnailMetrics = {
    faceSizePercent: 0,
    eyeVisibility: 0,
    headlineReadability: 0,
    contrast: 0,
    mobilePreview120: 0,
    safeArea: 0,
    characterVisibility: 0,
    logoVisibility: 0,
    storeBadgeVisibility: 0,
    relationshipScore: 0,
  };
  if (!existsSync(input.jpgPath)) return empty;

  try {
    const out = execFileSync(
      "python3",
      [
        "-c",
        `
from PIL import Image, ImageStat, ImageFilter
import json
import numpy as np
im = Image.open(${JSON.stringify(input.jpgPath)}).convert("RGB")
w, h = im.size
# Character / face band (center-lower safe zone)
face = im.crop((int(w*0.18), int(h*0.22), int(w*0.88), int(h*0.82)))
# Non-purple skin/character proxy (vectorized)
fa = np.asarray(face, dtype=np.int16)
r,g,b = fa[:,:,0], fa[:,:,1], fa[:,:,2]
char_mask = ((r+g+b) > 220) | ((np.abs(r-g)<40) & (r>140)) | ((r>180) & (g>160)) | (((r+g) > b) & (np.maximum(np.maximum(r,g),b) > 100) & ~((b>140) & (r<120)))
face_pct = 100.0 * float(np.count_nonzero(char_mask)) / max(1, char_mask.size)

edges = face.convert("L").filter(ImageFilter.FIND_EDGES)
estat = ImageStat.Stat(edges)
eye = min(100.0, (sum(estat.mean)/max(1,len(estat.mean))) * 4.2)

# Headline band (top safe)
head = im.crop((int(w*0.08), int(h*0.04), int(w*0.92), int(h*0.22))).convert("L")
hstat = ImageStat.Stat(head)
head_contrast = sum(hstat.stddev)/max(1,len(hstat.stddev))
words = len(${JSON.stringify(input.headline)}.split())
readability = min(100.0, head_contrast * 1.8 + (25 if words <= 4 else 0) + (15 if words <= 3 else 0))

# Global contrast
gstat = ImageStat.Stat(im.convert("L"))
contrast = min(100.0, (sum(gstat.stddev)/max(1,len(gstat.stddev))) * 1.6)

# Mobile 120px
mob = im.resize((120, max(1,int(120*h/w))), Image.Resampling.LANCZOS).convert("L")
mstat = ImageStat.Stat(mob)
mobile = min(100.0, (sum(mstat.stddev)/max(1,len(mstat.stddev))) * 2.0 + readability * 0.25)

# Safe area: energy in center 76% vs edges
core = im.crop((int(w*0.12), int(h*0.12), int(w*0.88), int(h*0.78)))
edge_top = im.crop((0,0,w,int(h*0.08)))
cstat = ImageStat.Stat(core.convert("L"))
estat2 = ImageStat.Stat(edge_top.convert("L"))
safe = min(100.0, 55 + (sum(cstat.mean)-sum(estat2.mean))*0.15 + face_pct*0.25)

# Logo / badges bottom band visibility
bot = im.crop((0, int(h*0.86), w, h))
bstat = ImageStat.Stat(bot.convert("L"))
bot_edge = bot.convert("L").filter(ImageFilter.FIND_EDGES)
bestat = ImageStat.Stat(bot_edge)
logo_vis = min(100.0, (sum(bestat.mean)/max(1,len(bestat.mean))) * 5.5)
badge_vis = min(100.0, logo_vis * 0.95 + (sum(bstat.stddev)/max(1,len(bstat.stddev))) * 0.4)

char_vis = min(100.0, face_pct * 1.35 + eye * 0.15)
# Relationship: both left+right character energy in mid band
left = im.crop((int(w*0.15), int(h*0.28), int(w*0.50), int(h*0.80)))
right = im.crop((int(w*0.45), int(h*0.28), int(w*0.88), int(h*0.80)))
lstat = ImageStat.Stat(left.convert("L").filter(ImageFilter.FIND_EDGES))
rstat = ImageStat.Stat(right.convert("L").filter(ImageFilter.FIND_EDGES))
rel = min(100.0, ((sum(lstat.mean)+sum(rstat.mean))/2) * 3.8)

print(json.dumps({
  "faceSizePercent": round(face_pct,1),
  "eyeVisibility": round(eye,1),
  "headlineReadability": round(readability,1),
  "contrast": round(contrast,1),
  "mobilePreview120": round(mobile,1),
  "safeArea": round(safe,1),
  "characterVisibility": round(char_vis,1),
  "logoVisibility": round(logo_vis,1),
  "storeBadgeVisibility": round(badge_vis,1),
  "relationshipScore": round(rel,1),
}))
`,
      ],
      { encoding: "utf8" },
    ).trim();
    return JSON.parse(out) as ThumbnailMetrics;
  } catch {
    return empty;
  }
}

/** Heuristic CTR prediction from metrics (target > 10%). */
export function predictCtrPercent(metrics: ThumbnailMetrics): number {
  const score =
    metrics.faceSizePercent * 0.18 +
    metrics.eyeVisibility * 0.12 +
    metrics.headlineReadability * 0.16 +
    metrics.contrast * 0.12 +
    metrics.mobilePreview120 * 0.14 +
    metrics.characterVisibility * 0.12 +
    metrics.relationshipScore * 0.1 +
    metrics.safeArea * 0.06;
  // Map ~55–90 composite → ~6–14% CTR band for parenting Shorts
  const ctr = 4 + (score / 100) * 12;
  return Math.round(Math.min(18, Math.max(3, ctr)) * 10) / 10;
}
