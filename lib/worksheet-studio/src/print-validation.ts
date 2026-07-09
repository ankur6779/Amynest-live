import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN, type WorksheetDocument } from "./types.js";
import { FONT_SIZES_BY_CLASS, EXPORT_DPI } from "./constants.js";
import { getLpsStandard } from "./lps-standards.js";
import type { ValidationIssue } from "./educational-quality-engine.js";

const MIN_EXPORT_FONT = 11;
const SAFE_BOTTOM = 48;

export function validatePrintReadiness(doc: WorksheetDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = getLpsStandard(doc.meta.classLevel);
  const fonts = FONT_SIZES_BY_CLASS[doc.meta.classLevel];

  for (const page of doc.pages) {
    for (const el of page.elements) {
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
      if (el.y + el.height > A4_HEIGHT - PAGE_MARGIN - SAFE_BOTTOM) {
        issues.push({
          code: "OVERFLOW",
          severity: "error",
          message: "Content may clip at bottom of page.",
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

    const qCount = page.elements.filter((e) => e.type === "question_block").length;
    const usedHeight = page.elements.reduce((max, e) => Math.max(max, e.y + e.height), 0);
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

/** Auto-repair common print issues without changing pedagogy. */
export function repairPrintIssues(doc: WorksheetDocument): WorksheetDocument {
  const repaired = structuredClone(doc);
  const standard = getLpsStandard(repaired.meta.classLevel);
  const maxY = A4_HEIGHT - PAGE_MARGIN - SAFE_BOTTOM;

  repaired.pages = repaired.pages
    .map((page) => {
      let elements = [...page.elements];
      elements = elements.map((el) => {
        const next = { ...el };
        if (next.x < PAGE_MARGIN) next.x = PAGE_MARGIN;
        if (next.x + next.width > A4_WIDTH - PAGE_MARGIN) {
          next.width = A4_WIDTH - PAGE_MARGIN * 2 - next.x;
        }
        if (next.y + next.height > maxY) {
          next.y = Math.max(PAGE_MARGIN + 120, maxY - next.height);
        }
        if (next.type === "text" && next.fontSize < MIN_EXPORT_FONT) {
          next.fontSize = standard.minPromptFontSize;
        }
        if (next.type === "question_block" && next.answerLine && next.height < standard.writingAreaMinHeight) {
          next.height = standard.writingAreaMinHeight;
        }
        return next;
      });

      const qs = elements.filter((e) => e.type === "question_block");
      let y = page.pageNumber === 1 ? 200 : 48;
      for (const q of qs) {
        const idx = elements.findIndex((e) => e.id === q.id);
        if (idx >= 0) {
          elements[idx] = { ...elements[idx]!, y } as typeof elements[number];
          y += elements[idx]!.height + standard.sectionGap;
        }
      }
      return { ...page, elements };
    })
    .filter((page) => page.elements.some((e) => e.type === "question_block") || repaired.pages.length === 1);

  repaired.meta.updatedAt = new Date().toISOString();
  repaired.meta.pageCount = repaired.pages.length;
  return repaired;
}
