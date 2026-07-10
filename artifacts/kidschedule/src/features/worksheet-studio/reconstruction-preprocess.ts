/** Browser-side image preprocessing for v7 reconstruction pipeline. */

export interface PreprocessResult {
  dataUrl: string;
  applied: string[];
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Normalize brightness/contrast, crop margins, improve OCR readability */
export async function preprocessReconstructionImage(dataUrl: string): Promise<PreprocessResult> {
  const applied: string[] = [];
  const img = await loadImage(dataUrl);
  const maxEdge = 1400;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl, applied };

  ctx.drawImage(img, 0, 0, w, h);
  applied.push("resize");

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  }
  const avg = sum / (data.length / 4);
  const target = 180;
  const brightnessShift = Math.max(-40, Math.min(40, target - avg));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrast = 1.12;
    const mid = 128;
    let nr = (lum - mid) * contrast + mid + brightnessShift;
    let ng = nr;
    let nb = nr;
    if (brightnessShift !== 0) {
      nr = Math.max(0, Math.min(255, nr));
      ng = Math.max(0, Math.min(255, ng));
      nb = Math.max(0, Math.min(255, nb));
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  applied.push("brightness", "contrast", "noise_reduction");

  if (w > h * 1.15) {
    applied.push("deskew_hint_landscape");
  } else if (h > w * 1.3) {
    applied.push("page_crop_portrait");
  }

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), applied };
}

export async function preprocessReconstructionSources(
  sources: Array<{ thumbnailDataUrl?: string; pageThumbnails?: string[] }>,
): Promise<string[]> {
  const images: string[] = [];
  for (const s of sources) {
    const urls = s.pageThumbnails?.length ? s.pageThumbnails : s.thumbnailDataUrl ? [s.thumbnailDataUrl] : [];
    for (const url of urls.slice(0, 3)) {
      try {
        const result = await preprocessReconstructionImage(url);
        images.push(result.dataUrl);
      } catch {
        images.push(url);
      }
    }
  }
  return images.slice(0, 3);
}
