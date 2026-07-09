import type { WorksheetDocument } from "../types.js";
import { A4_HEIGHT, A4_WIDTH } from "../types.js";
import { EXPORT_SCALE_MULTIPLIER } from "../constants.js";

export type PageRenderFn = (pageIndex: number, dpiMultiplier?: number) => Promise<Uint8Array | string>;

/** Export worksheet pages as a multi-page PDF using pdf-lib */
export async function exportWorksheetPdf(
  document: WorksheetDocument,
  renderPagePng: PageRenderFn,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();

  for (let i = 0; i < document.pages.length; i++) {
    const pngData = await renderPagePng(i, EXPORT_SCALE_MULTIPLIER);
    const bytes = typeof pngData === "string"
      ? Uint8Array.from(atob(pngData.split(",")[1] ?? ""), (c) => c.charCodeAt(0))
      : pngData;

    const image = await pdf.embedPng(bytes);
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawImage(image, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
  }

  return pdf.save();
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAndDownloadPdf(
  document: WorksheetDocument,
  renderPagePng: PageRenderFn,
): Promise<void> {
  const bytes = await exportWorksheetPdf(document, renderPagePng);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const safeName = document.meta.topic.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "worksheet";
  await downloadBlob(blob, `lps-${safeName}.pdf`);
}
