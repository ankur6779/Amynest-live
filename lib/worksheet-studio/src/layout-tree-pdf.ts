/**
 * PDF renderer — draws ONLY from immutable layout tree. No position math.
 */
import type { LayoutNode, LayoutTree } from "./layout-tree.js";
import { flattenNodes, getAbsoluteRect } from "./layout-tree.js";
import type { WorksheetDocument } from "./types.js";
import { A4_HEIGHT, A4_WIDTH } from "./types.js";
import { buildLayoutTree, prepareLayoutForRender } from "./layout-tree.js";

type PdfPage = import("pdf-lib").PDFPage;
type PdfDoc = import("pdf-lib").PDFDocument;
type PdfRgbFn = (r: number, g: number, b: number) => import("pdf-lib").RGB;
type PdfColor = import("pdf-lib").RGB;
type PdfFont = Awaited<ReturnType<PdfDoc["embedFont"]>>;

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
    if (src.startsWith("/") || src.startsWith("http")) {
      const buf = new Uint8Array(await (await fetch(src)).arrayBuffer());
      return pdf.embedPng(buf);
    }
  } catch { /* skip */ }
  return null;
}

function drawLayoutTextNode(
  page: PdfPage,
  node: LayoutNode,
  font: PdfFont,
  bold: PdfFont,
  colorFn: (hex: string) => PdfColor,
) {
  const p = node.payload;
  if (!p.content) return;
  const f = p.fontWeight === "bold" ? bold : font;
  const size = p.fontSize ?? 12;
  const color = colorFn(p.color ?? "#111111");
  const r = node.rect;
  let lineY = r.y + size;
  for (const line of p.content.split("\n")) {
    let x = r.x;
    const tw = f.widthOfTextAtSize(line, size);
    if (p.textAlign === "center") x = r.x + (r.width - tw) / 2;
    else if (p.textAlign === "right") x = r.x + r.width - tw;
    page.drawText(line, { x, y: toPdfY(lineY), size, font: f, color });
    lineY += size * (p.lineHeight ?? 1.4);
  }
}

async function drawLayoutNode(
  page: PdfPage,
  node: LayoutNode,
  fonts: { reg: PdfFont; bold: PdfFont },
  pdf: PdfDoc,
  colorFn: (hex: string) => PdfColor,
) {
  const r = node.rect;
  const p = node.payload;

  switch (node.kind) {
    case "prompt":
    case "option":
    case "text":
    case "header":
    case "footer":
      drawLayoutTextNode(page, node, fonts.reg, fonts.bold, colorFn);
      break;
    case "illustration":
      if (p.src) {
        const img = await embedImageFromSrc(pdf, p.src);
        if (img) {
          const h = r.height;
          const w = (img.width / img.height) * h;
          page.drawImage(img, { x: r.x + (r.width - w) / 2, y: toPdfY(r.y + h), width: w, height: h });
        }
      } else if (p.emoji || p.label) {
        page.drawText(p.emoji ?? p.label ?? "", {
          x: r.x, y: toPdfY(r.y + r.height), size: 20, font: fonts.reg, color: colorFn("#333333"),
        });
      }
      break;
    case "answer_line":
      page.drawLine({
        start: { x: r.x, y: toPdfY(r.y) },
        end: { x: r.x + r.width, y: toPdfY(r.y) },
        thickness: p.strokeWidth ?? 1,
        color: colorFn(p.stroke ?? "#333333"),
      });
      break;
    case "shape":
    case "frame":
      if (p.shapeKind === "line") {
        page.drawLine({
          start: { x: r.x, y: toPdfY(r.y) },
          end: { x: r.x + r.width, y: toPdfY(r.y) },
          thickness: p.strokeWidth ?? 1,
          color: colorFn(p.stroke ?? "#333333"),
        });
      } else {
        page.drawRectangle({
          x: r.x, y: toPdfY(r.y + r.height), width: r.width, height: r.height,
          borderColor: colorFn(p.stroke ?? "#d4cfc4"),
          borderWidth: p.strokeWidth ?? 1,
          color: p.fill === "transparent" ? undefined : colorFn(p.fill ?? "#ffffff"),
        });
      }
      break;
    case "image":
      if (p.src) {
        const img = await embedImageFromSrc(pdf, p.src);
        if (img) page.drawImage(img, { x: r.x, y: toPdfY(r.y + r.height), width: r.width, height: r.height });
      }
      break;
    case "question_block":
      for (const child of node.children) {
        const absNode: LayoutNode = {
          ...child,
          rect: getAbsoluteRect(child, r),
        };
        await drawLayoutNode(page, absNode, fonts, pdf, colorFn);
      }
      break;
    default:
      break;
  }
}

/** Render worksheet PDF exclusively from layout tree geometry. */
export async function renderLayoutTreeToPdf(tree: LayoutTree): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const colorFn = (hex: string) => hexColor(rgb, hex);

  for (const layoutPage of tree.pages) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawRectangle({
      x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT,
      borderColor: colorFn("#d4cfc4"), borderWidth: 2, color: colorFn("#ffffff"),
    });

    const drawOrder = flattenNodes(layoutPage.nodes).sort((a, b) => a.zIndex - b.zIndex);
    for (const node of drawOrder) {
      if (node.kind === "question_block") {
        await drawLayoutNode(page, node, { reg: font, bold }, pdf, colorFn);
      } else if (!node.parentId) {
        await drawLayoutNode(page, node, { reg: font, bold }, pdf, colorFn);
      }
    }
  }

  return pdf.save();
}

export async function exportVectorPdfFromLayoutTree(document: WorksheetDocument): Promise<Uint8Array> {
  const { layoutTree } = prepareLayoutForRender(document);
  return renderLayoutTreeToPdf(layoutTree);
}
