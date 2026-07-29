/**
 * Premium CTA plate + motion — Duolingo / Headspace style end card.
 * Additive creative module only. Does not alter validators or publishing.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import { resolveBrandEndCard } from "../brand/end-card.js";
import { getBrandIdentityKit } from "../brand/identity.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");

export const CTA_HOME_SCREEN = join(
  REPO_ROOT,
  "artifacts/kidschedule/public/landing/screenshots/dashboard.png",
);

export const CTA_LOGO = join(
  REPO_ROOT,
  "artifacts/kidschedule/public/amynest-hero-logo.png",
);

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
if len(xs)==0: raise SystemExit("empty badge")
pad=4
crop=im.crop((max(0,xs.min()-pad), max(0,ys.min()-pad), min(im.width,xs.max()+1+pad), min(im.height,ys.max()+1+pad)))
crop.save(${JSON.stringify(outPng)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * Build the premium CTA still (1080×1920).
 * Amy AI is keyed off the official base (checkerboard removed) and grounded on the stage floor.
 */
export function writePremiumAdCtaPlate(options: {
  path: string;
  homeScreenPath?: string;
  amySourcePath?: string;
  logoPath?: string;
}): string {
  mkdirSync(dirname(options.path), { recursive: true });
  const brandEnd = resolveBrandEndCard("cta-premium");
  const kit = getBrandIdentityKit();
  const work = dirname(options.path);
  const playBadge = join(work, "cta-play-badge.png");
  const appBadge = join(work, "cta-app-badge.png");
  rasterizeSvg(brandEnd.googlePlayBadgePath, playBadge, 900);
  rasterizeSvg(brandEnd.appleAppStoreBadgePath, appBadge, 900);

  const home =
    options.homeScreenPath && existsSync(options.homeScreenPath)
      ? options.homeScreenPath
      : CTA_HOME_SCREEN;
  const logo =
    options.logoPath && existsSync(options.logoPath)
      ? options.logoPath
      : kit.appIconAsset;
  void CTA_LOGO;
  // Official base cutout (RGB checkerboard baked in) — key it cleanly into the stage.
  // Performance frames are full rooms; do not paste them as stickers.
  const amy = resolveBrandAssetPath("amyAiBase");
  void options.amySourcePath;

  if (!existsSync(home)) {
    throw new Error(`Real AmyNest home screen missing: ${home}`);
  }

  const script = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np
from collections import deque
W,H=1080,1920

def key_checkerboard(im):
    """Remove dark-gray baked checkerboard via border-color flood; keep Amy AI."""
    from collections import Counter
    rgb=np.array(im.convert("RGB"), dtype=np.float32)
    h,w,_=rgb.shape
    border=np.concatenate([
        rgb[0,:,:].reshape(-1,3), rgb[-1,:,:].reshape(-1,3),
        rgb[:,0,:].reshape(-1,3), rgb[:,-1,:].reshape(-1,3),
    ], axis=0)
    rounded=(border/12.0).round()*12.0
    keys=[tuple(map(int,x)) for x in rounded]
    common=[np.array(c, dtype=np.float32) for c,_ in Counter(keys).most_common(4)]
    def near_bg(y,x):
        pix=rgb[y,x]
        return min(float(np.linalg.norm(pix-c)) for c in common) < 28.0
    vis=np.zeros((h,w),dtype=bool)
    q=deque()
    for x in range(w):
        for y in (0,h-1):
            if near_bg(y,x):
                vis[y,x]=True; q.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            if not vis[y,x] and near_bg(y,x):
                vis[y,x]=True; q.append((x,y))
    bg=np.zeros((h,w),dtype=bool)
    while q:
        x,y=q.popleft(); bg[y,x]=True
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h and not vis[ny,nx] and near_bg(ny,nx):
                vis[ny,nx]=True; q.append((nx,ny))
    alpha=np.where(bg,0,255).astype(np.uint8)
    aimg=Image.fromarray(alpha,"L")
    aimg=aimg.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    alpha=np.array(aimg.filter(ImageFilter.GaussianBlur(1.0)))
    out=im.convert("RGBA")
    arr=np.array(out); arr[:,:,3]=alpha; out=Image.fromarray(arr,"RGBA")
    bb=out.getbbox()
    return out.crop(bb) if bb else out

def text_with_stroke(draw, xy, text, font, fill, stroke, sw=4):
    x,y=xy
    for dx in range(-sw,sw+1):
        for dy in range(-sw,sw+1):
            if dx*dx+dy*dy<=sw*sw and (dx or dy):
                draw.text((x+dx,y+dy), text, font=font, fill=stroke)
    draw.text((x,y), text, font=font, fill=fill)

def center_stroke(draw, y, text, font, fill, stroke, sw=4):
    bbox=draw.textbbox((0,0), text, font=font)
    tw=bbox[2]-bbox[0]
    text_with_stroke(draw, ((W-tw)//2, y), text, font, fill, stroke, sw)

# --- Stage: premium purple gradient + floor plane ---
base=Image.new("RGB",(W,H),(40,18,100))
px=base.load()
for y in range(H):
    t=y/H
    if t < 0.55:
        r=int(58 + 36*(1-t)); g=int(24 + 16*(1-t)); b=int(140 + 60*(1-t))
    else:
        u=(t-0.55)/0.45
        r=int(42 + 28*u); g=int(16 + 14*u); b=int(105 - 18*u)
    for x in range(W):
        dx=abs(x-W/2)/(W/2)
        f=1-0.18*dx*dx
        px[x,y]=(max(16,min(150,int(r*f))), max(8,min(72,int(g*f))), max(70,min(220,int(b*f))))
canvas=base.convert("RGBA")

# volumetric light + subtle particles
glow=Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow)
gd.ellipse((140,-60,940,480), fill=(201,182,255,70))
gd.ellipse((220,640,860,1380), fill=(106,44,255,32))
rng=np.random.default_rng(7)
for _ in range(56):
    x=int(rng.integers(40,W-40)); y=int(rng.integers(80,H-180)); r=int(rng.integers(1,3))
    gd.ellipse((x,y,x+r,y+r), fill=(255,255,255,int(rng.integers(35,100))))
canvas=Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(1)))

# floor plane (grounds Amy + phone)
floor=Image.new("RGBA",(W,H),(0,0,0,0)); fd=ImageDraw.Draw(floor)
fd.ellipse((20,1120,1060,1580), fill=(18,8,42,150))
fd.ellipse((80,1180,1000,1480), fill=(70,40,140,40))
floor=floor.filter(ImageFilter.GaussianBlur(14))
canvas=Image.alpha_composite(canvas, floor)

# glassmorphism product stage
glass=Image.new("RGBA",(W,H),(0,0,0,0)); gsd=ImageDraw.Draw(glass)
gsd.rounded_rectangle((48,250,1032,1180), radius=48, fill=(255,255,255,22), outline=(255,255,255,48), width=2)
blur=Image.new("RGBA",(W,H),(0,0,0,0)); bd=ImageDraw.Draw(blur)
bd.rounded_rectangle((48,250,1032,1180), radius=48, fill=(180,160,255,22))
blur=blur.filter(ImageFilter.GaussianBlur(12))
canvas=Image.alpha_composite(canvas, blur)
canvas=Image.alpha_composite(canvas, glass)

draw=ImageDraw.Draw(canvas)
try:
    head=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 68)
    sub=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    tiny=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
    store=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
except Exception:
    head=sub=tiny=store=ImageFont.load_default()

# --- Top 10%: official app icon + soft logo glow ---
logo=Image.open(${JSON.stringify(logo)}).convert("RGBA")
logo.thumbnail((156,156), Image.Resampling.LANCZOS)
mask=Image.new("L", logo.size, 0); md=ImageDraw.Draw(mask)
md.rounded_rectangle((0,0,logo.size[0]-1,logo.size[1]-1), radius=34, fill=255)
logo.putalpha(mask)
lg=Image.new("RGBA",(logo.width+90, logo.height+90),(0,0,0,0))
gd2=ImageDraw.Draw(lg)
gd2.ellipse((0,0,lg.width-1,lg.height-1), fill=(201,182,255,100))
lg=lg.filter(ImageFilter.GaussianBlur(18))
lx=(W-logo.width)//2
canvas.paste(lg, (lx-45, 42), lg)
canvas.paste(logo, (lx, 78), logo)

# --- Center-right: large phone with REAL AmyNest home screen ---
ui=Image.open(${JSON.stringify(home)}).convert("RGB")
pw,ph=430,860
uw,uh=ui.size
target_ratio=(pw-40)/(ph-108)
src_ratio=uw/uh
if src_ratio > target_ratio:
    nw=int(uh*target_ratio); x0=(uw-nw)//2; ui=ui.crop((x0,0,x0+nw,uh))
else:
    nh=int(uw/target_ratio); y0=(uh-nh)//2; ui=ui.crop((0,y0,uw,y0+nh))
ui=ui.resize((pw-40, ph-108), Image.Resampling.LANCZOS)
phone=Image.new("RGBA",(pw,ph),(18,14,32,255))
pd=ImageDraw.Draw(phone)
pd.rounded_rectangle((0,0,pw-1,ph-1), radius=52, fill=(10,8,18,255), outline=(240,230,255,255), width=7)
pd.rounded_rectangle((16,62,pw-17,ph-42), radius=28, fill=(255,255,255,255))
phone.paste(ui, (20, 68))
pd.rounded_rectangle((pw//2-56, 22, pw//2+56, 44), radius=10, fill=(0,0,0,255))
# phone contact shadow on floor
pshadow=Image.new("RGBA",(pw+60,ph+60),(0,0,0,0))
psd=ImageDraw.Draw(pshadow)
psd.rounded_rectangle((20,20,pw+20,ph+20), radius=56, fill=(0,0,0,140))
pshadow=pshadow.filter(ImageFilter.GaussianBlur(22))
phone_x=560; phone_y=300
canvas.paste(pshadow, (phone_x-10, phone_y+22), pshadow)
canvas.paste(phone, (phone_x, phone_y), phone)

# --- Amy AI left: keyed cutout composited onto floor (no checkerboard, no medallion) ---
amy_raw=Image.open(${JSON.stringify(amy)}).convert("RGB")
amy=key_checkerboard(amy_raw)
# Fit; wave hand is on the RIGHT of the asset → gestures toward phone
amy.thumbnail((500, 680), Image.Resampling.LANCZOS)
amy=ImageEnhance.Color(amy).enhance(1.06)
amy=ImageEnhance.Contrast(amy).enhance(1.04)
amy_x = 48
# Plant feet on the floor band (inside glass stage, beside phone)
amy_y = 1080 - amy.height
# Thin contact shadow under feet only (not a dark medallion)
sh=Image.new("RGBA",(int(amy.width*0.85), 48),(0,0,0,0))
sd=ImageDraw.Draw(sh)
sd.ellipse((0,8,sh.width-1,sh.height-1), fill=(0,0,0,120))
sh=sh.filter(ImageFilter.GaussianBlur(8))
canvas.paste(sh, (amy_x+amy.width//8, amy_y+amy.height-18), sh)
canvas.paste(amy, (amy_x, amy_y), amy)

# --- Bottom copy (OCR-critical: large, stroked, high contrast) ---
# Keep copy ABOVE the push-in crop danger zone; large enough for tesseract.
center_stroke(draw, 1235, "Download AmyNest AI", head, "#FFFFFF", "#1A0A40", 5)
center_stroke(draw, 1318, "Start Your Child's Learning Journey", sub, "#F6D57A", "#1A0A40", 3)

# --- Bottom row: equal high-contrast store badges (readable, same size) ---
def make_store_badge(eyebrow, title, tw=420, th=110):
    badge=Image.new("RGBA",(tw,th),(0,0,0,0))
    bd=ImageDraw.Draw(badge)
    bd.rounded_rectangle((0,0,tw-1,th-1), radius=14, fill=(12,12,16,255), outline=(245,245,250,255), width=2)
    try:
        f_eye=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
        f_title=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 36)
    except Exception:
        f_eye=f_title=ImageFont.load_default()
    bd.text((28, 18), eyebrow, fill=(230,230,235,255), font=f_eye)
    bd.text((28, 48), title, fill=(255,255,255,255), font=f_title)
    return badge

# Prefer raster badges when crisp; fall back to drawn badges for contrast/OCR
play_src=Image.open(${JSON.stringify(playBadge)}).convert("RGBA")
app_src=Image.open(${JSON.stringify(appBadge)}).convert("RGBA")
def strip_white_frame(im):
    a=np.array(im)
    near=((a[:,:,0]>240)&(a[:,:,1]>240)&(a[:,:,2]>240))
    a[:,:,3]=np.where(near, 0, a[:,:,3])
    out=Image.fromarray(a, "RGBA")
    bb=out.getbbox()
    return out.crop(bb) if bb else out
play_src=strip_white_frame(play_src); app_src=strip_white_frame(app_src)
target_h=104
# Brighten official badges so they aren't purple-muddy
def brighten_badge(im, th):
    im=im.resize((max(1,int(im.width*th/im.height)), th), Image.Resampling.LANCZOS)
    a=np.array(im).astype(np.float32)
    # lift dark tones toward true black badge on white glyphs
    rgb=a[:,:,:3]
    alpha=a[:,:,3:4]/255.0
    rgb=np.clip(rgb*1.25+18, 0, 255)
    a[:,:,:3]=rgb
    return Image.fromarray(a.astype(np.uint8), "RGBA")
play=brighten_badge(play_src, target_h)
astore=brighten_badge(app_src, target_h)
# Equal width
badge_w=max(play.width, astore.width, 400)
def pad_badge(im, tw):
    layer=Image.new("RGBA",(tw, im.height),(0,0,0,0))
    layer.paste(im, ((tw-im.width)//2, 0), im)
    return layer
play=pad_badge(play, badge_w); astore=pad_badge(astore, badge_w)
# If badges still too muddy, overlay crisp drawn labels underneath glyphs area — keep both OCR strings
drawn_play=make_store_badge("GET IT ON", "Google Play", badge_w, target_h)
drawn_app=make_store_badge("Download on the", "App Store", badge_w, target_h)
# Use drawn badges for guaranteed contrast; official art optional accent
play=drawn_play; astore=drawn_app
gap=36
total=play.width+astore.width+gap
bx=(W-total)//2
by=1385
for ox,im in ((bx,play),(bx+play.width+gap,astore)):
    canvas.paste(im, (ox, by), im)

center_stroke(draw, by+target_h+20, "Google Play   ·   App Store", store, "#F0E8FF", "#1A0A40", 2)
center_stroke(draw, by+target_h+58, "amynest.in", tiny, "#E0D2FF", "#1A0A40", 2)

canvas.convert("RGB").save(${JSON.stringify(options.path)}, quality=95)
print("ok", ${JSON.stringify(options.path)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
  if (!existsSync(options.path)) throw new Error("CTA plate missing after write");
  return options.path;
}

/** Animate CTA plate: 3.5–4s slow push-in + soft glow pulse. Bottom CTA copy stays in frame. */
export function animatePremiumCta(options: {
  platePath: string;
  outputPath: string;
  seconds?: number;
}): string {
  const s = options.seconds ?? 3.8;
  mkdirSync(dirname(options.outputPath), { recursive: true });
  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(s),
    "-i",
    options.platePath,
    "-filter_complex",
    // Gentle center push-in — prefer x drift; keep y small so headline/badges stay OCR-visible.
    `[0:v]scale=1180:2098:force_original_aspect_ratio=increase,crop=1080:1920:x='min(70,12*t)':y='min(40,6*t)',eq=brightness='0.01*sin(2*PI*t/2.4)':saturation=1.03,fps=30,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(s),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    options.outputPath,
  ]);
  return options.outputPath;
}
