const MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.88;
const MAX_BYTES = 1_200_000;

const imageCache = new Map<string, string>();

export function getCachedImage(key: string): string | undefined {
  return imageCache.get(key);
}

export function cacheImage(key: string, dataUrl: string): void {
  if (imageCache.size > 40) {
    const first = imageCache.keys().next().value;
    if (first) imageCache.delete(first);
  }
  imageCache.set(key, dataUrl);
}

export async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = DEFAULT_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BYTES && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  if (file.type === "image/svg+xml" || file.type.startsWith("image/")) {
    if (file.size > 200_000 && file.type !== "image/svg+xml") {
      return compressImageFile(file);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function acceptImageTypes(): string {
  return "image/png,image/jpeg,image/jpg,image/webp,image/svg+xml";
}
