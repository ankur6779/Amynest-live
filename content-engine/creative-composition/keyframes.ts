/**
 * Identity keyframes for Veo image-to-video.
 * Official character bases are staged into 9:16 environments as FIRST FRAMES only —
 * never used as slideshow plates.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import type { BrandCharacterId, EnvironmentId } from "./types.js";

const ENV_RGB: Partial<Record<EnvironmentId, [number, number, number]>> = {
  "kitchen-table": [240, 220, 200],
  "child-bedroom": [230, 220, 245],
  "study-desk": [235, 228, 245],
  "living-room": [220, 215, 235],
  playroom: [245, 230, 220],
  "magic-learning-world": [60, 35, 120],
  "cta-stage": [70, 30, 168],
  "dining-table": [235, 215, 195],
  "homework-corner": [232, 225, 245],
  "reading-corner": [225, 218, 240],
  library: [210, 220, 235],
  school: [230, 235, 245],
  garden: [210, 235, 210],
  park: [200, 230, 200],
  "bedroom-night": [40, 30, 70],
  "bedroom-morning": [245, 230, 220],
  "morning-breakfast": [245, 225, 200],
  "rainy-window": [180, 190, 210],
  "space-world": [30, 25, 70],
  "astro-observatory": [35, 30, 75],
  "healthy-kitchen": [235, 240, 220],
  "fridge-magnet-wall": [240, 225, 210],
  "mirror-practice-nook": [230, 220, 235],
  balcony: [200, 220, 235],
  terrace: [210, 225, 240],
  cafe: [230, 220, 210],
  museum: [220, 225, 230],
  "science-center": [215, 230, 240],
  playground: [200, 230, 200],
  "apartment-hallway": [225, 220, 215],
  "car-ride": [230, 225, 220],
  "book-store": [220, 210, 200],
  "festival-home": [245, 220, 200],
};

function envRgb(env: EnvironmentId): [number, number, number] {
  return ENV_RGB[env] ?? [235, 228, 245];
}

export function resolveCharacterBase(character: BrandCharacterId): string {
  if (character === "amy-ai") return resolveBrandAssetPath("amyAiBase");
  if (character === "amy-girl") return resolveBrandAssetPath("amyGirlBase");
  return resolveBrandAssetPath("amyBoyBase");
}

/**
 * Build a 1080×1920 first-frame seed: character identity locked from official base,
 * seated in a designed environment wash (not a final scene plate).
 */
export function writeIdentityKeyframe(options: {
  outputPath: string;
  character: BrandCharacterId;
  environment: EnvironmentId;
}): string {
  mkdirSync(dirname(options.outputPath), { recursive: true });
  const basePath = resolveCharacterBase(options.character);
  if (!existsSync(basePath)) {
    throw new Error(`Official character base missing: ${basePath}`);
  }
  const [r, g, b] = envRgb(options.environment);
  const script = `
from PIL import Image, ImageDraw, ImageFilter
W,H=1080,1920
bg=Image.new("RGB",(W,H),(${r},${g},${b}))
px=bg.load()
for y in range(H):
    t=y/H
    for x in range(W):
        dx=abs(x-W/2)/(W/2)
        f=1-0.12*dx*dx
        rr=int((${r}+(40 if ${r}<100 else -30)*t)*f)
        gg=int((${g}+(20 if ${g}<100 else -20)*t)*f)
        bb=int((${b}+(50 if ${b}<150 else -10)*t)*f)
        px[x,y]=(max(0,min(255,rr)), max(0,min(255,gg)), max(0,min(255,bb)))
# soft depth bands
overlay=Image.new("RGBA",(W,H),(0,0,0,0))
od=ImageDraw.Draw(overlay)
od.ellipse((-120,1200,600,2100), fill=(0,0,0,35))
od.ellipse((500,-80,1300,500), fill=(201,182,255,40))
canvas=Image.alpha_composite(bg.convert("RGBA"), overlay)
char=Image.open(${JSON.stringify(basePath)}).convert("RGBA")
# Character fills mid-frame; preserve identity, do not crop face harshly
target_h=int(H*0.72)
ratio=target_h/char.height
nw=max(1,int(char.width*ratio))
char=char.resize((nw, target_h), Image.Resampling.LANCZOS)
# soft contact shadow
shadow=Image.new("RGBA",(char.width+80, 90),(0,0,0,0))
sd=ImageDraw.Draw(shadow)
sd.ellipse((0,0,shadow.width-1,shadow.height-1), fill=(0,0,0,90))
shadow=shadow.filter(ImageFilter.GaussianBlur(12))
x=(W-char.width)//2
y=H-char.height-140
canvas.paste(shadow, (x-40, y+char.height-50), shadow)
canvas.paste(char, (x,y), char)
canvas.convert("RGB").save(${JSON.stringify(options.outputPath)}, quality=95)
`;
  execFileSync("python3", ["-c", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!existsSync(options.outputPath)) {
    throw new Error(`Keyframe write failed: ${options.outputPath}`);
  }
  return options.outputPath;
}
