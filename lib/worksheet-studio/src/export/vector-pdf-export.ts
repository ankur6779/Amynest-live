/**
 * Vector PDF export — selectable text, embedded fonts, sharp at any zoom.
 */
import type {
  WorksheetDocument,
  WorksheetElement,
  WorksheetQuestionBlock,
  WorksheetShapeElement,
  WorksheetTextElement,
} from "../types.js";
import { A4_HEIGHT, A4_WIDTH } from "../types.js";
import { downloadBlob } from "./pdf-export.js";

type PdfPage = import("pdf-lib").PDFPage;
type PdfDoc = import("pdf-lib").PDFDocument;
type PdfRgbFn = (r: number, g: number, b: number) => import("pdf-lib").RGB;
type PdfColor = import("pdf-lib").RGB;

function toPdfY(topDownY: number, height = 0): number {
  return A4_HEIGHT - topDownY - height;
}

function hexColor(rgb: PdfRgbFn, hex: string): PdfColor {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function embedImageFromSrc(pdf: PdfDoc, src: string) {
  try {
    if (src.startsWith("data:image/png")) {
      const b64 = src.split(",")[1] ?? "";
      return pdf.embedPng(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    }
    if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) {
      const b64 = src.split(",")[1] ?? "";
      return pdf.embedJpg(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    }
    if (src.startsWith("data:image/svg+xml")) {
      const svg = src.includes("base64") ? atob(src.split(",")[1] ?? "") : decodeURIComponent(src.split(",")[1] ?? "");
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
        return pdf.embedPng(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (src.startsWith("/") || src.startsWith("http")) {
      const buf = new Uint8Array(await (await fetch(src)).arrayBuffer());
      return pdf.embedPng(buf);
    }
  } catch { /* skip */ }
  return null;
}

function drawText(
  page: PdfPage,
  el: WorksheetTextElement,
  font: Awaited<ReturnType<PdfDoc["embedFont"]>>,
  bold: Awaited<ReturnType<PdfDoc["embedFont"]>>,
  colorFn: (hex: string) => PdfColor,
) {
  const f = el.fontWeight === "bold" ? bold : font;
  const size = el.fontSize;
  const color = colorFn(el.color);
  let lineY = el.y + size;
  for (const line of el.content.split("\n")) {
    let x = el.x;
    const tw = f.widthOfTextAtSize(line, size);
    if (el.textAlign === "center") x = el.x + (el.width - tw) / 2;
    else if (el.textAlign === "right") x = el.x + el.width - tw;
    page.drawText(line, { x, y: toPdfY(lineY), size, font: f, color });
    lineY += size * (el.lineHeight ?? 1.4);
  }
}

function drawShape(page: PdfPage, el: WorksheetShapeElement, colorFn: (hex: string) => PdfColor) {
  const stroke = colorFn(el.stroke);
  if (el.shapeKind === "rect") {
    page.drawRectangle({
      x: el.x, y: toPdfY(el.y + el.height), width: el.width, height: el.height,
      borderColor: stroke, borderWidth: el.strokeWidth,
      color: el.fill === "transparent" ? undefined : colorFn(el.fill),
    });
  } else if (el.shapeKind === "line") {
    page.drawLine({
      start: { x: el.x, y: toPdfY(el.y) },
      end: { x: el.x + el.width, y: toPdfY(el.y) },
      thickness: el.strokeWidth, color: stroke,
    });
  }
}

async function drawQuestion(
  page: PdfPage,
  el: WorksheetQuestionBlock,
  font: Awaited<ReturnType<PdfDoc["embedFont"]>>,
  bold: Awaited<ReturnType<PdfDoc["embedFont"]>>,
  pdf: PdfDoc,
  colorFn: (hex: string) => PdfColor,
) {
  drawText(page, { ...el, type: "text", content: el.prompt, fontSize: 14, fontWeight: "bold", textAlign: "left", color: "#111111", y: el.y, height: 20 } as WorksheetTextElement, bold, bold, colorFn);
  let offsetY = el.y + 22;
  if (el.illustrationLabel) {
    page.drawText(el.illustrationLabel, { x: el.x, y: toPdfY(offsetY + 14), size: 11, font, color: colorFn("#333333") });
    offsetY += 28;
  }
  el.options?.forEach((opt, i) => {
    page.drawText(opt, { x: el.x + (i % 2) * 160, y: toPdfY(offsetY + Math.floor(i / 2) * 16 + 12), size: 11, font, color: colorFn("#111111") });
  });
  if (el.answerLine) {
    page.drawLine({
      start: { x: el.x, y: toPdfY(offsetY + 40) },
      end: { x: el.x + 140, y: toPdfY(offsetY + 40) },
      thickness: 1, color: colorFn("#333333"),
    });
  }
  if (el.illustrationSrc) {
    const img = await embedImageFromSrc(pdf, el.illustrationSrc);
    if (img) {
      const h = 56;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: el.x + (el.width - w) / 2, y: toPdfY(el.y + 50 + h), width: w, height: h });
    }
  }
}

async function drawElement(
  page: PdfPage,
  el: WorksheetElement,
  fonts: { reg: Awaited<ReturnType<PdfDoc["embedFont"]>>; bold: Awaited<ReturnType<PdfDoc["embedFont"]>> },
  pdf: PdfDoc,
  colorFn: (hex: string) => PdfColor,
) {
  if (el.type === "text") drawText(page, el, fonts.reg, fonts.bold, colorFn);
  else if (el.type === "shape") drawShape(page, el, colorFn);
  else if (el.type === "question_block") await drawQuestion(page, el, fonts.reg, fonts.bold, pdf, colorFn);
  else if (el.type === "image") {
    const img = await embedImageFromSrc(pdf, el.src);
    if (img) page.drawImage(img, { x: el.x, y: toPdfY(el.y + el.height), width: el.width, height: el.height });
  }
}

export async function exportVectorPdf(document: WorksheetDocument): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(document.meta.title);
  pdf.setProducer("LPS AI Worksheet Studio");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const colorFn = (hex: string) => hexColor(rgb, hex);

  for (const pg of document.pages) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawRectangle({
      x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT,
      borderColor: colorFn("#d4cfc4"), borderWidth: 2, color: colorFn("#ffffff"),
    });
    const sorted = [...pg.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) await drawElement(page, el, { reg: font, bold }, pdf, colorFn);
  }
  return pdf.save();
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
