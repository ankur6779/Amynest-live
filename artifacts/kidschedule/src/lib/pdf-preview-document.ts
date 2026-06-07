/**
 * PDF.js options for in-app preview — range requests, no full-file prefetch.
 * Full PDF bytes load only when the user turns pages (download flow unchanged).
 */
import { getDocument } from "pdfjs-dist";

export const PDF_PREVIEW_RANGE_CHUNK_BYTES = 65_536;

type PdfDocumentInit = Parameters<typeof getDocument>[0];

/** Shared init for nutrition / kids-how library preview viewers. */
export function pdfPreviewDocumentInit(url: string): PdfDocumentInit {
  return {
    url,
    disableAutoFetch: true,
    disableStream: false,
    rangeChunkSize: PDF_PREVIEW_RANGE_CHUNK_BYTES,
  };
}
