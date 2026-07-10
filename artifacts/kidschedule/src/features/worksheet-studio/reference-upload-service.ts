import {
  detectReferenceKind,
  type ReferenceFileKind,
  type WorksheetReferenceContext,
} from "@workspace/worksheet-studio";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { compressImageFile, readFileAsDataUrl } from "./image-service";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PDF_THUMB_MAX = 3;
const THUMB_WIDTH = 120;

function uid(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function renderPdfPageThumb(data: Uint8Array, pageNum: number): Promise<string> {
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const scale = THUMB_WIDTH / viewport.width;
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await page.render({ canvasContext: ctx, viewport: scaled }).promise;
  return canvas.toDataURL("image/jpeg", 0.75);
}

async function analyzePdf(file: File): Promise<Partial<WorksheetReferenceContext>> {
  const buf = await file.arrayBuffer();
  const data = new Uint8Array(buf);
  const doc = await getDocument({ data }).promise;
  const pageCount = doc.numPages;
  const thumbs: string[] = [];
  for (let p = 1; p <= Math.min(pageCount, PDF_THUMB_MAX); p++) {
    try {
      thumbs.push(await renderPdfPageThumb(data, p));
    } catch { /* skip page */ }
  }
  return {
    pageCount,
    imageCount: Math.max(1, Math.floor(pageCount * 1.5)),
    thumbnailDataUrl: thumbs[0],
    pageThumbnails: thumbs,
    layoutHints: ["worksheet layout", "bordered sections", "question blocks"],
    textSnippet: `PDF reference with ${pageCount} page(s) — use layout and question style as inspiration only.`,
  };
}

async function analyzeDocx(file: File): Promise<Partial<WorksheetReferenceContext>> {
  return {
    pageCount: 1,
    imageCount: 0,
    layoutHints: ["document layout", "question formatting"],
    textSnippet: `DOCX reference "${file.name}" — extract question style and structure inspiration only; do not copy text.`,
  };
}

async function analyzeImage(file: File, kind: ReferenceFileKind): Promise<Partial<WorksheetReferenceContext>> {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    imageCount: 1,
    thumbnailDataUrl: dataUrl,
    pageThumbnails: [dataUrl],
    layoutHints: kind === "svg" ? ["vector illustration", "clean outlines"] : ["illustration reference"],
    textSnippet: `Image reference for illustration style — reuse teacher-uploaded asset where appropriate.`,
  };
}

export async function processReferenceFile(file: File): Promise<WorksheetReferenceContext> {
  const kind = detectReferenceKind(file.name, file.type);
  if (!kind) throw new Error(`Unsupported file: ${file.name}`);

  const base: WorksheetReferenceContext = {
    id: uid(),
    filename: file.name,
    kind,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };

  if (kind === "pdf") return { ...base, ...(await analyzePdf(file)) };
  if (kind === "docx") return { ...base, ...(await analyzeDocx(file)) };
  return { ...base, ...(await analyzeImage(file, kind)) };
}

export async function processReferenceFiles(files: File[]): Promise<WorksheetReferenceContext[]> {
  const out: WorksheetReferenceContext[] = [];
  for (const f of files) {
    out.push(await processReferenceFile(f));
  }
  return out;
}

export async function replaceReferenceFile(
  existing: WorksheetReferenceContext,
  file: File,
): Promise<WorksheetReferenceContext> {
  const next = await processReferenceFile(file);
  return { ...next, id: existing.id };
}

/** Paste from clipboard — returns files if image pasted */
export function filesFromClipboardEvent(e: ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];
  const files: File[] = [];
  for (const item of items) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}

export async function compressPastedImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const dataUrl = await compressImageFile(file);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], file.name || "pasted-image.jpg", { type: "image/jpeg" });
}
