import { downloadBlob } from "./pdf-export.js";

export async function exportCanvasPng(
  dataUrl: string,
  filename: string,
): Promise<void> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await downloadBlob(blob, filename);
}

export async function exportCanvasJpeg(
  dataUrl: string,
  filename: string,
  quality = 0.92,
): Promise<void> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const jpegUrl = canvas.toDataURL("image/jpeg", quality);
  const res = await fetch(jpegUrl);
  const blob = await res.blob();
  await downloadBlob(blob, filename);
}

export function printWorksheet(title: string): void {
  window.print();
}

export type ShareResult = "shared" | "cancelled" | "unsupported";

export async function shareWorksheetFile(
  file: File,
  title: string,
): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  return "unsupported";
}
