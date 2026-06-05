/** Canvas compositor — child photo + costume overlay for shareable "magic mirror" preview. */

import type { CostumeProp } from "@/lib/event-prep-costume-props";

export interface CostumePreviewInput {
  childPhotoDataUrl: string;
  childName: string;
  costumeLabel: string;
  emoji: string;
  accent: [string, string];
  /** Optional costume inspiration thumbnail. */
  costumeImageUrl?: string;
  /** Draggable prop placements from Magic Mirror. */
  props?: CostumeProp[];
}

const OUT_W = 900;
const OUT_H = 1125;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const dr = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ir > dr) {
    sw = img.height * dr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSparkles(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = accent;
  const spots = [
    [0.12, 0.18, 6],
    [0.88, 0.14, 5],
    [0.08, 0.42, 4],
    [0.92, 0.38, 5],
    [0.18, 0.72, 4],
    [0.82, 0.68, 6],
  ] as const;
  for (const [px, py, r] of spots) {
    ctx.beginPath();
    ctx.arc(px * OUT_W, py * OUT_H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export async function composeCostumePreview(input: CostumePreviewInput): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const photo = await loadImage(input.childPhotoDataUrl);

  coverDraw(ctx, photo, 0, 0, OUT_W, OUT_H);

  const grad = ctx.createLinearGradient(0, OUT_H * 0.45, 0, OUT_H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.55, `${input.accent[1]}88`);
  grad.addColorStop(1, `${input.accent[0]}dd`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  const sideGrad = ctx.createLinearGradient(0, 0, OUT_W, 0);
  sideGrad.addColorStop(0, `${input.accent[0]}33`);
  sideGrad.addColorStop(1, `${input.accent[1]}33`);
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  drawSparkles(ctx, input.accent[0]);

  if (input.costumeImageUrl) {
    try {
      const costume = await loadImage(input.costumeImageUrl);
      const tw = 140;
      const th = 140;
      const tx = OUT_W - tw - 28;
      const ty = 36;
      ctx.save();
      roundRect(ctx, tx, ty, tw, th, 18);
      ctx.clip();
      coverDraw(ctx, costume, tx, ty, tw, th);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 3;
      roundRect(ctx, tx, ty, tw, th, 18);
      ctx.stroke();
    } catch { /* optional thumbnail */ }
  }

  const props = input.props?.length
    ? input.props
    : [{
        id: "main",
        emoji: input.emoji,
        label: input.costumeLabel,
        kind: "main" as const,
        x: 0.5,
        y: 0.22,
        scale: 1.15,
        rotation: 0,
      }];

  for (const prop of props) {
    const size = (prop.kind === "main" ? 140 : prop.kind === "cape" ? 110 : 88) * prop.scale;
    const px = prop.x * OUT_W;
    const py = prop.y * OUT_H;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((prop.rotation * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${size}px serif`;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 16;
    ctx.fillText(prop.emoji, 0, 0);
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  const badgeH = 118;
  const badgeY = OUT_H - badgeH - 36;
  const badgePad = 28;
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  roundRect(ctx, badgePad, badgeY, OUT_W - badgePad * 2, badgeH, 24);
  ctx.fill();

  const barGrad = ctx.createLinearGradient(badgePad, badgeY, OUT_W - badgePad, badgeY);
  barGrad.addColorStop(0, input.accent[0]);
  barGrad.addColorStop(1, input.accent[1]);
  ctx.fillStyle = barGrad;
  ctx.globalAlpha = 0.92;
  roundRect(ctx, badgePad, badgeY, OUT_W - badgePad * 2, badgeH, 24);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(input.childName, OUT_W / 2, badgeY + 44);
  ctx.font = "26px system-ui, sans-serif";
  ctx.globalAlpha = 0.95;
  ctx.fillText(`as ${input.costumeLabel}`, OUT_W / 2, badgeY + 82);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 6;
  roundRect(ctx, 14, 14, OUT_W - 28, OUT_H - 28, 28);
  ctx.stroke();

  return canvas.toDataURL("image/jpeg", 0.88);
}

/** Capture a video frame + optional overlay for selfie mirror. */
export function captureVideoFrame(
  video: HTMLVideoElement,
  width = OUT_W,
  height = OUT_H,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const dr = width / height;
  const ir = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (ir > dr) {
    sw = vh * dr;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / dr;
    sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}
