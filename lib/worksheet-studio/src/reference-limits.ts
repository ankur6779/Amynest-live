import type { ReferenceFileKind, WorksheetReferenceContext } from "./types.js";

export const REFERENCE_MAX_FILES = 10;
export const REFERENCE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const PROMPT_MAX_CHARS = 2000;
export const ENHANCED_PROMPT_MAX_CHARS = 4000;

const EXT_MAP: Record<string, ReferenceFileKind> = {
  pdf: "pdf",
  docx: "docx",
  png: "image",
  jpg: "image",
  jpeg: "image",
  heic: "image",
  heif: "image",
  webp: "image",
  svg: "svg",
};

const MIME_MAP: Record<string, ReferenceFileKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "image",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/heic": "image",
  "image/heif": "image",
  "image/webp": "image",
  "image/svg+xml": "svg",
};

export function detectReferenceKind(filename: string, mimeType: string): ReferenceFileKind | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_MAP[mimeType] ?? EXT_MAP[ext] ?? null;
}

export function acceptReferenceMimeTypes(): string {
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/heic",
    "image/heif",
    "image/webp",
    "image/svg+xml",
    ".pdf,.docx,.png,.jpg,.jpeg,.heic,.heif,.webp,.svg",
  ].join(",");
}

/** v7 — accept string for reconstruction uploads (camera, scans, WhatsApp images) */
export function acceptReconstructionMimeTypes(): string {
  return acceptReferenceMimeTypes();
}

const VISION_IMAGE_MAX = 3;
const VISION_DATA_URL_MAX_CHARS = 120_000;

/** Prepare lightweight vision payload for reconstruction API */
export function prepareVisionImagesForApi(
  sources: WorksheetReferenceContext[],
): string[] {
  const images: string[] = [];
  for (const s of sources) {
    if (s.thumbnailDataUrl) images.push(s.thumbnailDataUrl);
    if (s.pageThumbnails) images.push(...s.pageThumbnails);
    if (images.length >= VISION_IMAGE_MAX) break;
  }
  return images
    .slice(0, VISION_IMAGE_MAX)
    .map((url) => (url.length > VISION_DATA_URL_MAX_CHARS ? url.slice(0, VISION_DATA_URL_MAX_CHARS) : url));
}

/** Strip heavy fields but keep reconstruction metadata */
export function stripSourcesForReconstructionApi(
  sources: WorksheetReferenceContext[],
): WorksheetReferenceContext[] {
  return sources.map((r) => ({
    id: r.id,
    filename: r.filename,
    kind: r.kind,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    pageCount: r.pageCount,
    imageCount: r.imageCount,
    textSnippet: r.textSnippet?.slice(0, 500),
    layoutHints: r.layoutHints,
  }));
}

export interface ReferenceValidationResult {
  ok: boolean;
  error?: string;
}

export function validateReferenceBatch(
  existing: WorksheetReferenceContext[],
  incoming: { sizeBytes: number; filename: string; mimeType: string }[],
): ReferenceValidationResult {
  if (existing.length + incoming.length > REFERENCE_MAX_FILES) {
    return { ok: false, error: `Maximum ${REFERENCE_MAX_FILES} reference files allowed.` };
  }
  const total =
    existing.reduce((s, r) => s + r.sizeBytes, 0) +
    incoming.reduce((s, f) => s + f.sizeBytes, 0);
  if (total > REFERENCE_MAX_TOTAL_BYTES) {
    return { ok: false, error: "Total reference size cannot exceed 50 MB." };
  }
  for (const f of incoming) {
    if (!detectReferenceKind(f.filename, f.mimeType)) {
      return { ok: false, error: `Unsupported file type: ${f.filename}` };
    }
  }
  return { ok: true };
}

export function countReferenceImages(refs: WorksheetReferenceContext[]): number {
  return refs.reduce((sum, r) => sum + (r.imageCount ?? (r.kind === "image" || r.kind === "svg" ? 1 : 0)), 0);
}

/** Strip heavy binary fields before sending references to the API */
export function stripReferencesForApi(refs: WorksheetReferenceContext[]): WorksheetReferenceContext[] {
  return refs.map((r) => ({
    id: r.id,
    filename: r.filename,
    kind: r.kind,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    pageCount: r.pageCount,
    imageCount: r.imageCount,
    textSnippet: r.textSnippet?.slice(0, 300),
    layoutHints: r.layoutHints,
  }));
}
