/**
 * Generate official AmyNest YouTube thumbnail stills (1280×720).
 * v2: variant focus + interaction poses + vertical safe-area margins.
 * Uses ONLY Character Bible / official badge assets — never redesigns.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import { getBrandIdentityKit } from "../brand/identity.js";
import type {
  InteractionPose,
  ThumbnailAssets,
  ThumbnailVariantFocus,
} from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OFFICIAL = join(HERE, "..", "brand", "assets", "official");

function resolveBadge(primary: string, fallback: string): string {
  const a = join(OFFICIAL, primary);
  const b = join(OFFICIAL, fallback);
  if (existsSync(a)) return a;
  if (existsSync(b)) return b;
  throw new Error(`Official badge missing: ${primary}`);
}

export function generateThumbnailAssets(input: {
  outputDir: string;
  headline: string;
  partner: "amy-girl" | "amy-boy";
  /** File prefix for variants (default "thumbnail"). */
  basename?: string;
  focus?: ThumbnailVariantFocus;
  interaction?: InteractionPose;
}): ThumbnailAssets {
  mkdirSync(input.outputDir, { recursive: true });
  const base = input.basename ?? "thumbnail";
  const kit = getBrandIdentityKit();
  const jpgPath = join(input.outputDir, `${base}.jpg`);
  const webpPath = join(input.outputDir, `${base}.webp`);
  const previewPath = join(input.outputDir, `${base}-preview.png`);
  const coverStillPath = join(input.outputDir, `${base}-cover-still.png`);
  const mobilePreviewPath = join(input.outputDir, `${base}-mobile-120.png`);

  const amyAi = resolveBrandAssetPath("amyAiBase");
  const child =
    input.partner === "amy-boy"
      ? resolveBrandAssetPath("amyBoyBase")
      : resolveBrandAssetPath("amyGirlBase");
  const logo = kit.appIconAsset;
  const play = resolveBadge("cta-google-play.png", "google-play-badge-clean.png");
  const app = resolveBadge("cta-app-store.png", "app-store-badge-clean.png");

  for (const p of [amyAi, child, logo, play, app]) {
    if (!existsSync(p)) throw new Error(`Thumbnail asset missing: ${p}`);
  }

  const focus = input.focus ?? "emotion-first";
  const interaction = input.interaction ?? "helping";

  // Hierarchy: characters > emotion > headline > logo > badges
  const childH =
    focus === "character-first" ? 470 : focus === "feature-first" ? 390 : 440;
  const amyH =
    focus === "character-first" ? 400 : focus === "feature-first" ? 330 : 370;
  const headSize =
    focus === "feature-first" ? 88 : focus === "character-first" ? 72 : 82;
  const badgeScale = focus === "feature-first" ? 200 : 180;

  // Interaction offsets — Amy as visual anchor, child overlapping (relationship)
  const pose =
    interaction === "pointing"
      ? { amyX: -40, childX: 30, amyY: -10, childY: 0 }
      : interaction === "celebrating"
        ? { amyX: -20, childX: 50, amyY: -25, childY: -15 }
        : interaction === "encouraging"
          ? { amyX: -55, childX: 10, amyY: 5, childY: 10 }
          : { amyX: -35, childX: 20, amyY: 0, childY: 5 };

  const script = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np

W, H = 1280, 720
# Vertical safe margins for Shorts/Reels/TikTok crop of landscape thumb (~12% top / 18% bottom)
SAFE_TOP = int(H * 0.10)
SAFE_BOTTOM = int(H * 0.82)
headline = ${JSON.stringify(input.headline)}
amy_path = ${JSON.stringify(amyAi)}
child_path = ${JSON.stringify(child)}
logo_path = ${JSON.stringify(logo)}
play_path = ${JSON.stringify(play)}
app_path = ${JSON.stringify(app)}
jpg_path = ${JSON.stringify(jpgPath)}
webp_path = ${JSON.stringify(webpPath)}
preview_path = ${JSON.stringify(previewPath)}
cover_path = ${JSON.stringify(coverStillPath)}
mobile_path = ${JSON.stringify(mobilePreviewPath)}
child_h = ${childH}
amy_h = ${amyH}
head_size = ${headSize}
badge_w = ${badgeScale}
pose_amy_x, pose_child_x = ${pose.amyX}, ${pose.childX}
pose_amy_y, pose_child_y = ${pose.amyY}, ${pose.childY}
focus = ${JSON.stringify(focus)}

def key_checkerboard(im):
    aa = np.array(im)
    if aa.shape[2] == 3:
        aa = np.dstack([aa, np.full(aa.shape[:2], 255, dtype=np.uint8)])
    chk = (
        (aa[:,:,0] > 90) & (aa[:,:,0] < 190)
        & (aa[:,:,1] > 90) & (aa[:,:,1] < 190)
        & (aa[:,:,2] > 90) & (aa[:,:,2] < 190)
        & (np.abs(aa[:,:,0].astype(int) - aa[:,:,1].astype(int)) < 18)
        & (np.abs(aa[:,:,1].astype(int) - aa[:,:,2].astype(int)) < 18)
    )
    aa[:,:,3] = np.where(chk, 0, aa[:,:,3])
    return Image.fromarray(aa, "RGBA")

base = Image.new("RGB", (W, H), (70, 30, 168))
px = base.load()
for y in range(H):
    t = y / H
    for x in range(W):
        dx = abs(x - W/2) / (W/2)
        f = 1 - 0.10 * dx * dx
        r = int((55 + 38 * (1 - t)) * f)
        g = int((16 + 18 * (1 - t)) * f)
        b = int((145 + 65 * (1 - abs(t - 0.35))) * f)
        px[x, y] = (max(30, min(120, r)), max(8, min(48, g)), max(100, min(230, b)))

canvas = base.convert("RGBA")
# Soft particles (static seed — live cover animates them)
parts = Image.new("RGBA", (W, H), (0, 0, 0, 0))
pd = ImageDraw.Draw(parts)
rng = np.random.default_rng(42)
for _ in range(28):
    x = int(rng.integers(40, W - 40)); y = int(rng.integers(SAFE_TOP, SAFE_BOTTOM))
    r = int(rng.integers(2, 6))
    pd.ellipse((x-r, y-r, x+r, y+r), fill=(201, 182, 255, int(rng.integers(40, 90))))
canvas = Image.alpha_composite(canvas, parts)

draw = ImageDraw.Draw(canvas)
try:
    head_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", head_size)
except Exception:
    head_font = ImageFont.load_default()

# Headline inside safe top — characters dominate hierarchy
bbox = draw.textbbox((0, 0), headline, font=head_font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
hx = (W - tw) // 2
hy = max(SAFE_TOP - 8, 28)
plate_a = 170 if focus == "character-first" else 200
draw.rounded_rectangle(
    (hx - 22, hy - 10, hx + tw + 22, hy + th + 14),
    radius=18,
    fill=(18, 11, 46, plate_a),
)
draw.rounded_rectangle(
    (hx - 22, hy - 10, hx + tw + 22, hy + th + 14),
    radius=18,
    outline=(246, 213, 122, 210),
    width=3,
)
draw.text((hx, hy), headline, fill="#FFFFFF", font=head_font)

child = key_checkerboard(Image.open(child_path).convert("RGBA"))
amy = key_checkerboard(Image.open(amy_path).convert("RGBA"))
ratio = child_h / child.height
child = child.resize((max(1, int(child.width * ratio)), child_h), Image.Resampling.LANCZOS)
ratio = amy_h / amy.height
amy = amy.resize((max(1, int(amy.width * ratio)), amy_h), Image.Resampling.LANCZOS)

def shadow_for(im, blur=14, alpha=90):
    s = Image.new("RGBA", (im.width + 60, 70), (0, 0, 0, 0))
    sd = ImageDraw.Draw(s)
    sd.ellipse((0, 0, s.width - 1, s.height - 1), fill=(0, 0, 0, alpha))
    return s.filter(ImageFilter.GaussianBlur(blur))

# Amy visual anchor LEFT-CENTER, child overlapping RIGHT — relationship, not separate
cx = W // 2 + 10 + pose_child_x
cy = min(SAFE_BOTTOM - child.height, H - child.height - 100) + pose_child_y
ax = W // 2 - amy.width + 30 + pose_amy_x
ay = min(SAFE_BOTTOM - amy.height, H - amy.height - 120) + pose_amy_y

canvas.paste(shadow_for(child), (cx - 20, cy + child.height - 40), shadow_for(child))
canvas.paste(shadow_for(amy, 12, 80), (ax - 10, ay + amy.height - 35), shadow_for(amy, 12, 80))
# Amy first (behind slightly), child in front — helping / interacting
canvas.paste(amy, (ax, ay), amy)
canvas.paste(child, (cx, cy), child)

# Bottom chrome inside safe bottom — small logo + badges (never dominate)
logo = Image.open(logo_path).convert("RGBA")
logo.thumbnail((72, 72), Image.Resampling.LANCZOS)
play = Image.open(play_path).convert("RGBA")
play.thumbnail((badge_w, 60), Image.Resampling.LANCZOS)
appb = Image.open(app_path).convert("RGBA")
appb.thumbnail((badge_w, 60), Image.Resampling.LANCZOS)
by = H - 84
lx = 48
canvas.paste(logo, (lx, by + (60 - logo.height) // 2), logo)
bx = lx + logo.width + 18
canvas.paste(play, (bx, by), play)
canvas.paste(appb, (bx + play.width + 12, by), appb)

rgb = canvas.convert("RGB")
rgb = ImageEnhance.Sharpness(rgb).enhance(1.18)
rgb.save(jpg_path, "JPEG", quality=88, optimize=True, progressive=True)
rgb.save(webp_path, "WEBP", quality=85, method=6)
rgb.save(preview_path, "PNG", optimize=True)
rgb.save(cover_path, "PNG", optimize=True)
# 120px-wide mobile preview evidence
mob = rgb.resize((120, max(1, int(120 * H / W))), Image.Resampling.LANCZOS)
mob.save(mobile_path, "PNG", optimize=True)
`;

  execFileSync("python3", ["-c", script], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });

  const size = statSync(jpgPath).size;
  if (size >= 2 * 1024 * 1024) {
    execFileSync(
      "python3",
      [
        "-c",
        `from PIL import Image; Image.open(${JSON.stringify(jpgPath)}).convert("RGB").save(${JSON.stringify(jpgPath)}, "JPEG", quality=78, optimize=True)`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  }

  return {
    jpgPath,
    webpPath,
    previewPath,
    coverStillPath,
    mobilePreviewPath,
  };
}
