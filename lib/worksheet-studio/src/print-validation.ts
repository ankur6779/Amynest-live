import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN, type WorksheetDocument, type WorksheetElement } from "./types.js";
import { FONT_SIZES_BY_CLASS, EXPORT_DPI } from "./constants.js";
import { getLpsStandard } from "./lps-standards.js";
import type { ValidationIssue } from "./educational-quality-engine.js";
import {
  CONTENT_WIDTH,
  isDecorativeLayoutElement,
  reflowDocumentLayout,
  validateLayoutGeometry,
} from "./flow-layout-engine.js";

const MIN_EXPORT_FONT = 11;

function isDecorativeElement(el: WorksheetElement): boolean {
  return isDecorativeLayoutElement(el.id);
}

export function validatePrintReadiness(doc: WorksheetDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = getLpsStandard(doc.meta.classLevel);
  const fonts = FONT_SIZES_BY_CLASS[doc.meta.classLevel];

  for (const layoutIssue of validateLayoutGeometry(doc)) {
    issues.push({
      code: "LAYOUT_OVERLAP",
      severity: "error",
      message: layoutIssue,
    });
  }

  for (const page of doc.pages) {
    const contentEls = page.elements.filter((e) => !isDecorativeElement(e));
    for (const el of contentEls) {
      if (el.x < PAGE_MARGIN - 2) {
        issues.push({
          code: "MARGIN_LEFT",
          severity: "error",
          message: "Object outside left print margin.",
          pageNumber: page.pageNumber,
        });
      }
      if (el.x + el.width > A4_WIDTH - PAGE_MARGIN + 2) {
        issues.push({
          code: "MARGIN_RIGHT",
          severity: "error",
          message: "Object outside right print margin.",
          pageNumber: page.pageNumber,
        });
      }
      if (el.type === "text" && el.fontSize < MIN_EXPORT_FONT) {
        issues.push({
          code: "FONT_TOO_SMALL",
          severity: "warn",
          message: "Text may be hard to read when printed.",
          pageNumber: page.pageNumber,
        });
      }
      if (el.type === "image" && el.width < 40) {
        issues.push({
          code: "IMAGE_DPI",
          severity: "warn",
          message: "Image may appear blurry in print.",
          pageNumber: page.pageNumber,
        });
      }
      const opacity = (el as { opacity?: number }).opacity;
      if (opacity != null && opacity < 0.2) {
        issues.push({
          code: "HIDDEN_LAYER",
          severity: "warn",
          message: "Nearly invisible object detected.",
          pageNumber: page.pageNumber,
        });
      }
    }

    const qCount = contentEls.filter((e) => e.type === "question_block").length;
    const usedHeight = contentEls.reduce((max, e) => Math.max(max, e.y + e.height), 0);
    const fillRatio = usedHeight / (A4_HEIGHT - PAGE_MARGIN * 2);
    if (qCount > 0 && fillRatio < 0.35 && doc.pages.length > 1) {
      issues.push({
        code: "SPARSE_PAGE",
        severity: "warn",
        message: `Page ${page.pageNumber} has excess whitespace.`,
        pageNumber: page.pageNumber,
      });
    }
    if (fillRatio > 0.92) {
      issues.push({
        code: "CROWDED_PRINT",
        severity: "warn",
        message: `Page ${page.pageNumber} is too dense for printing.`,
        pageNumber: page.pageNumber,
      });
    }
  }

  if (fonts.prompt < standard.minPromptFontSize) {
    issues.push({ code: "CLASS_FONT", severity: "warn", message: "Font below LPS class standard." });
  }

  void EXPORT_DPI;
  return issues;
}

/** Auto-repair print issues — reflows through the flow layout engine (no hardcoded Y). */
export function repairPrintIssues(doc: WorksheetDocument): WorksheetDocument {
  const repaired = structuredClone(doc);
  const standard = getLpsStandard(repaired.meta.classLevel);

  repaired.pages = repaired.pages.map((page) => {
    const elements = page.elements.map((el) => {
      if (isDecorativeElement(el)) return el;
      const next = { ...el };
      if (next.x < PAGE_MARGIN) next.x = PAGE_MARGIN;
      if (next.x + next.width > A4_WIDTH - PAGE_MARGIN) {
        next.width = CONTENT_WIDTH;
      }
      if (next.type === "text" && next.fontSize < MIN_EXPORT_FONT) {
        next.fontSize = standard.minPromptFontSize;
      }
      if (next.type === "question_block") {
        next.locked = false;
        if (next.answerLine && next.height < standard.writingAreaMinHeight) {
          next.height = standard.writingAreaMinHeight;
        }
      }
      return next;
    });
    return { ...page, elements };
  });

  const reflowed = reflowDocumentLayout(repaired);
  reflowed.meta.updatedAt = new Date().toISOString();
  reflowed.meta.pageCount = reflowed.pages.length;
  return reflowed;
}
