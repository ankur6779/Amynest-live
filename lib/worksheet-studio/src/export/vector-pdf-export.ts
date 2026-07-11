/**
 * Vector PDF export — delegates to layout-tree renderer (single source of truth).
 */
import type { WorksheetDocument } from "../types.js";
import { downloadBlob } from "./pdf-export.js";

export async function exportVectorPdf(document: WorksheetDocument): Promise<Uint8Array> {
  const { exportVectorPdfFromLayoutTree } = await import("../layout-tree-pdf.js");
  return exportVectorPdfFromLayoutTree(document);
}

export async function exportAndDownloadVectorPdf(document: WorksheetDocument): Promise<void> {
  const bytes = await exportVectorPdf(document);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const safeName = document.meta.topic.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "worksheet";
  await downloadBlob(blob, `lps-${safeName}.pdf`);
}

export async function exportBestQualityPdf(
  document: WorksheetDocument,
  rasterFallback?: import("./pdf-export.js").PageRenderFn,
): Promise<Uint8Array> {
  try {
    return await exportVectorPdf(document);
  } catch {
    if (!rasterFallback) throw new Error("PDF export failed");
    const { exportWorksheetPdf } = await import("./pdf-export.js");
    return exportWorksheetPdf(document, rasterFallback);
  }
}

export async function exportAndDownloadBestPdf(
  document: WorksheetDocument,
  rasterFallback?: import("./pdf-export.js").PageRenderFn,
): Promise<void> {
  const bytes = await exportBestQualityPdf(document, rasterFallback);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const safeName = document.meta.topic.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "worksheet";
  await downloadBlob(blob, `lps-${safeName}.pdf`);
}
