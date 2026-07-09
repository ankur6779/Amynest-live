import type { WorksheetDocument } from "./types.js";
import { exportVectorPdf } from "./export/vector-pdf-export.js";
import { downloadBlob } from "./export/pdf-export.js";
import { prepareWorksheetForExport } from "./worksheet-pipeline.js";

export async function exportDocumentPdf(doc: WorksheetDocument, filename?: string): Promise<void> {
  const prepared = prepareWorksheetForExport(doc);
  const bytes = await exportVectorPdf(prepared);
  const safe = (filename ?? prepared.meta.topic).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  await downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${safe}.pdf`);
}

export async function exportBulkPdfs(docs: WorksheetDocument[], onProgress?: (n: number, total: number) => void): Promise<void> {
  for (let i = 0; i < docs.length; i++) {
    await exportDocumentPdf(docs[i]!, `worksheet-${i + 1}`);
    onProgress?.(i + 1, docs.length);
    await new Promise((r) => setTimeout(r, 400));
  }
}

/** Minimal ZIP-like bundle: sequential downloads with shared prefix */
export async function exportBulkZip(
  docs: WorksheetDocument[],
  zipName = "worksheets",
  onProgress?: (n: number, total: number) => void,
): Promise<void> {
  await exportBulkPdfs(docs, onProgress);
  void zipName;
}

export async function createShareablePdfBlob(doc: WorksheetDocument): Promise<Blob> {
  const prepared = prepareWorksheetForExport(doc);
  const bytes = await exportVectorPdf(prepared);
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
