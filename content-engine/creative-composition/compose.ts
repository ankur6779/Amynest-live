/**
 * Creative Composition — continuous Veo character performances (no still montages).
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { GeminiVideoProvider } from "../asset-engine/providers/gemini-video/index.js";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import { resolveBrandEndCard } from "../brand/end-card.js";
import { getBrandIdentityKit } from "../brand/identity.js";
import type { ContentPackage } from "../types/content-package.js";
import { writeIdentityKeyframe } from "./keyframes.js";
import { performancePrompt } from "./performances.js";
import { planCinematicShort } from "./plan.js";
import type {
  ComposedShotArtifact,
  CreativeCompositionPlan,
} from "./types.js";

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function rasterizeSvg(svgPath: string, outPng: string, size = 900): void {
  const tmpDir = dirname(outPng);
  mkdirSync(tmpDir, { recursive: true });
  const staged = join(tmpDir, `badge-${size}-${Date.now()}.svg`);
  copyFileSync(svgPath, staged);
  execFileSync("qlmanage", ["-t", "-s", String(size), "-o", tmpDir, staged], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const produced = `${staged}.png`;
  if (!existsSync(produced)) throw new Error(`Badge raster failed: ${svgPath}`);
  const script = `
from PIL import Image
import numpy as np
im=Image.open(${JSON.stringify(produced)}).convert("RGBA")
a=np.array(im)
mask=((a[:,:,0]<245)|(a[:,:,1]<245)|(a[:,:,2]<245)) & (a[:,:,3]>8)
ys,xs=np.where(mask)
if len(xs)==0:
    raise SystemExit("Badge raster empty after qlmanage")
pad=8
crop=im.crop((max(0,xs.min()-pad), max(0,ys.min()-pad), min(im.width,xs.max()+1+pad), min(im.height,ys.max()+1+pad)))
crop.save(${JSON.stringify(outPng)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

function writeCaptionPng(path: string, text: string): void {
  const script = `
from PIL import Image, ImageDraw, ImageFont
W,H=1000,210
img=Image.new("RGBA",(W,H),(0,0,0,0))
draw=ImageDraw.Draw(img)
try:
    font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 42)
except Exception:
    font=ImageFont.load_default()
words=${JSON.stringify(text)}.split()
lines=[]; cur=""
for w in words:
    t=(cur+" "+w).strip()
    bbox=draw.textbbox((0,0),t,font=font)
    if bbox[2]-bbox[0] > W-70 and cur:
        lines.append(cur); cur=w
    else:
        cur=t
if cur: lines.append(cur)
lines=lines[:3]
y=16
for line in lines:
    bbox=draw.textbbox((0,0),line,font=font)
    tw=bbox[2]-bbox[0]; th=bbox[3]-bbox[1]
    x=(W-tw)//2
    draw.rounded_rectangle((x-16,y-8,x+tw+16,y+th+12), radius=20, fill=(18,11,46,200))
    draw.text((x,y), line, fill="white", font=font)
    y += th + 18
img.save(${JSON.stringify(path)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

function writePremiumCtaPlatePng(options: {
  path: string;
  playBadge: string;
  appBadge: string;
  logoPath: string;
  amyAiPath: string;
  headline: string;
  subhead: string;
}): void {
  const script = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1080,1920
base=Image.new("RGB",(W,H),(70,30,168))
px=base.load()
for y in range(H):
    t=y/H
    r=int(28+(90-28)*(1-t*0.85)); g=int(12+(40-12)*(1-t)); b=int(90+(210-90)*(0.55+0.35*(1-abs(t-0.4))))
    for x in range(W):
        dx=abs(x-W/2)/(W/2); f=1-0.18*dx*dx
        px[x,y]=(max(20,min(120,int(r*f))), max(8,min(55,int(g*f))), max(90,min(230,int(b*f))))
canvas=base.convert("RGBA")
orb=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(orb)
od.ellipse((80,40,1000,620), fill=(201,182,255,48))
canvas=Image.alpha_composite(canvas, orb)
draw=ImageDraw.Draw(canvas)
try:
    head=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 58)
    sub=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    store=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 44)
    tiny=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
except Exception:
    head=sub=store=tiny=ImageFont.load_default()

def center(y, text, font, fill):
    bbox=draw.textbbox((0,0), text, font=font)
    tw=bbox[2]-bbox[0]
    draw.text(((W-tw)//2, y), text, fill=fill, font=font)

logo=Image.open(${JSON.stringify(options.logoPath)}).convert("RGBA")
logo.thumbnail((200,200))
lx=(W-logo.width)//2
canvas.paste(logo, (lx, 90), logo)
center(320, ${JSON.stringify(options.headline)}, head, "#FFFFFF")
center(400, ${JSON.stringify(options.subhead)}, sub, "#F6D57A")

amy=Image.open(${JSON.stringify(options.amyAiPath)}).convert("RGBA")
amy=amy.resize((520,520), Image.Resampling.LANCZOS)
mask=Image.new("L", amy.size, 0); md=ImageDraw.Draw(mask)
md.ellipse((20,20,amy.width-20,amy.height-20), fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(12)); amy.putalpha(mask)
canvas.paste(amy, (W-amy.width-30, 460), amy)

play=Image.open(${JSON.stringify(options.playBadge)}).convert("RGBA")
astore=Image.open(${JSON.stringify(options.appBadge)}).convert("RGBA")
play.thumbnail((760, 260)); astore.thumbnail((760, 260))
by=1080
canvas.paste(play, ((W-play.width)//2, by), play)
canvas.paste(astore, ((W-astore.width)//2, by+play.height+20), astore)
# Explicit OCR-readable store names (validators scan end-card frames)
center(by+play.height+astore.height+36, "Google Play", store, "#FFFFFF")
center(by+play.height+astore.height+90, "App Store", store, "#FFFFFF")
center(by+play.height+astore.height+150, "www.amynest.in", tiny, "#C9B6FF")
canvas.convert("RGB").save(${JSON.stringify(options.path)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

function burnCaption(options: {
  videoPath: string;
  captionPng: string;
  outputPath: string;
  seconds: number;
}): void {
  ffmpeg([
    "-i",
    options.videoPath,
    "-loop",
    "1",
    "-t",
    String(options.seconds),
    "-i",
    options.captionPng,
    "-filter_complex",
    `[0:v]trim=0:${options.seconds},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[base];[1:v]format=rgba[cap];[base][cap]overlay=(W-w)/2:H-h-150:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(options.seconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    options.outputPath,
  ]);
}

function burnCtaPerformance(options: {
  veoPath: string;
  ctaPlatePath: string;
  captionPng: string;
  outputPath: string;
  workDir: string;
  seconds: number;
}): void {
  // 1.5s live Amy AI wave + 2.5s solid premium end card (OCR-readable badges/text).
  const wave = join(options.workDir, "cta-wave.mp4");
  const card = join(options.workDir, "cta-card.mp4");
  const waveSec = Math.min(1.5, options.seconds - 2.5);
  const cardSec = options.seconds - waveSec;
  ffmpeg([
    "-i",
    options.veoPath,
    "-filter_complex",
    `[0:v]trim=0:${waveSec},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(waveSec),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    wave,
  ]);
  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(cardSec),
    "-i",
    options.ctaPlatePath,
    "-loop",
    "1",
    "-t",
    String(cardSec),
    "-i",
    options.captionPng,
    "-filter_complex",
    `[0:v]scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920:x='min(180,22*t)':y='min(120,18*t)',fps=30,format=yuv420p[base];[1:v]format=rgba[cap];[base][cap]overlay=(W-w)/2:H-h-120:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(cardSec),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    card,
  ]);
  const list = join(options.workDir, "cta-concat.txt");
  writeFileSync(
    list,
    `file '${wave.replace(/'/g, "'\\''")}'\nfile '${card.replace(/'/g, "'\\''")}'\n`,
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-t",
    String(options.seconds),
    options.outputPath,
  ]);
}

export interface ComposeCinematicInput {
  content: ContentPackage;
  workDir: string;
  outputDir: string;
  geminiApiKey: string;
  /** Veo model — keep google-veo provider; default daily Fast. */
  veoModel?: string;
  totalDurationSeconds?: number;
  resolution?: "720p" | "1080p";
}

export interface ComposeCinematicResult {
  plan: CreativeCompositionPlan;
  shots: ComposedShotArtifact[];
  clipPaths: string[];
  ctaPlatePath: string;
  detail: string;
  continuity: Array<{
    shotId: string;
    character: string;
    provider: string;
    model: string;
    imageToVideo: boolean;
    keyframePath?: string;
    videoPath: string;
  }>;
}

/**
 * Compose a full Short from continuous Veo character performances.
 */
export async function composeCinematicVisuals(
  input: ComposeCinematicInput,
): Promise<ComposeCinematicResult> {
  mkdirSync(input.workDir, { recursive: true });
  const keyDir = join(input.workDir, "keyframes");
  const veoDir = join(input.workDir, "veo");
  mkdirSync(keyDir, { recursive: true });
  mkdirSync(veoDir, { recursive: true });

  const plan = planCinematicShort(
    input.content,
    input.totalDurationSeconds ?? 21,
  );

  const veoModel = input.veoModel ?? "veo-3.1-fast-generate-preview";
  const veo = new GeminiVideoProvider({
    apiKey: input.geminiApiKey,
    settings: {
      enabled: true,
      model: veoModel,
      outputDirectory: veoDir,
      durationSeconds: 6,
      resolution: input.resolution ?? "720p",
      personGeneration: "allow_all",
    },
  });

  const brandEnd = resolveBrandEndCard("creative-composition");
  const kit = getBrandIdentityKit();
  const playBadge = join(input.workDir, "google-play-large.png");
  const appBadge = join(input.workDir, "app-store-large.png");
  rasterizeSvg(brandEnd.googlePlayBadgePath, playBadge, 1000);
  rasterizeSvg(brandEnd.appleAppStoreBadgePath, appBadge, 1000);

  const shots: ComposedShotArtifact[] = [];
  const clipPaths: string[] = [];
  const continuity: ComposeCinematicResult["continuity"] = [];
  let ctaPlatePath = "";

  for (const shot of plan.shots) {
    const captionPng = join(input.workDir, `${shot.id}-caption.png`);
    writeCaptionPng(captionPng, shot.caption);
    const keyframePath = join(keyDir, `${shot.id}-identity.png`);
    writeIdentityKeyframe({
      outputPath: keyframePath,
      character: shot.character,
      environment: shot.environment,
    });

    const { prompt, negativePrompt } = performancePrompt(shot);
    const rawVeo = join(veoDir, `${shot.id}-raw.mp4`);
    const outClip = join(input.workDir, `${shot.id}.mp4`);

    let modelUsed = veoModel;
    let imageToVideo = true;
    if (existsSync(rawVeo) && process.env.AMYNEST_REUSE_VEO !== "0") {
      console.log(
        `[creative-composition] Reusing Veo clip ${shot.id} → ${rawVeo}`,
      );
    } else {
      console.log(
        `[creative-composition] Veo performance ${shot.id} (${shot.character}, ${shot.durationSeconds}s, ${veoModel})`,
      );
      const generated = await veo.generateVideo({
        prompt,
        negativePrompt,
        assetId: shot.id,
        sceneId: shot.id,
        aspectRatio: "9:16",
        durationSeconds: shot.durationSeconds,
        resolution: input.resolution ?? "720p",
        outputPath: rawVeo,
        imagePath: keyframePath,
      });
      modelUsed = generated.metadata.model;
      imageToVideo = Boolean(generated.metadata.imageToVideo);
    }

    if (shot.kind === "cta-overlay") {
      const plate = join(input.workDir, "cta-premium-plate.png");
      writePremiumCtaPlatePng({
        path: plate,
        playBadge,
        appBadge,
        logoPath: kit.appIconAsset,
        amyAiPath: keyframePath,
        headline: "Download AmyNest AI",
        subhead: "Start Your Child's Learning Journey",
      });
      ctaPlatePath = plate;
      burnCtaPerformance({
        veoPath: rawVeo,
        ctaPlatePath: plate,
        captionPng,
        outputPath: outClip,
        workDir: input.workDir,
        seconds: shot.durationSeconds,
      });
      shots.push({
        plan: shot,
        videoPath: outClip,
        keyframePath,
        provider: "cta-overlay",
        model: modelUsed,
        detail: "Veo Amy AI wave + solid OCR-readable premium end card",
        imageToVideo: true,
      });
    } else {
      burnCaption({
        videoPath: rawVeo,
        captionPng,
        outputPath: outClip,
        seconds: shot.durationSeconds,
      });
      shots.push({
        plan: shot,
        videoPath: outClip,
        keyframePath,
        provider: "google-veo",
        model: modelUsed,
        detail: `Veo continuous performance — ${shot.character}`,
        imageToVideo,
      });
    }

    continuity.push({
      shotId: shot.id,
      character: shot.character,
      provider: "google-veo",
      model: modelUsed,
      imageToVideo,
      keyframePath,
      videoPath: outClip,
    });
    clipPaths.push(outClip);
  }

  // Still plate for evidence end-card OCR if needed
  if (!ctaPlatePath) {
    ctaPlatePath = resolveBrandAssetPath("appIcon");
  }

  writeFileSync(
    join(input.workDir, "composition-plan.json"),
    JSON.stringify({ plan, continuity }, null, 2),
  );
  writeFileSync(
    join(input.workDir, "continuity.json"),
    JSON.stringify(continuity, null, 2),
  );

  return {
    plan,
    shots,
    clipPaths,
    ctaPlatePath,
    detail: `Composed ${shots.length} Veo character performances (${veoModel}); rules=${plan.rulesApplied.join(",")}`,
    continuity,
  };
}
