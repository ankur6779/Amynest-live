import type { WorksheetDocument, WorksheetElement, WorksheetMeta, WorksheetTextElement } from "./types.js";
import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN } from "./types.js";
import { FONT_SIZES_BY_CLASS } from "./constants.js";
import type { SchoolBrandingProfile } from "./school-branding.js";
import { LPS_SCHOOL_NAME } from "./constants.js";

/** Inset from physical page edge for decorative border */
export const PAGE_FRAME_INSET = 10;

const PAGE_ELEMENT_PREFIXES = ["page_border_", "page_border_inner_", "page_continuation_"];

export function isPageFrameElement(id: string): boolean {
  return PAGE_ELEMENT_PREFIXES.some((p) => id.startsWith(p));
}

export function stripPageFrameElements<T extends { pages: { elements: { id: string }[] }[] }>(doc: T): T {
  const out = structuredClone(doc);
  for (const page of out.pages) {
    page.elements = page.elements.filter((el) => !isPageFrameElement(el.id));
  }
  return out;
}

function frameText(
  id: string,
  content: string,
  x: number,
  y: number,
  opts: Partial<WorksheetTextElement>,
): WorksheetTextElement {
  return {
    id,
    type: "text",
    content,
    x,
    y,
    width: opts.width ?? A4_WIDTH - PAGE_MARGIN * 2,
    height: opts.height ?? 24,
    fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? "normal",
    textAlign: opts.textAlign ?? "left",
    color: opts.color ?? "#1e3a5f",
    lineHeight: opts.lineHeight ?? 1.3,
    zIndex: 1,
    locked: true,
  };
}

/** Professional double-line page border on every page + topic bar on pages 2+ */
export function buildPageFrameElements(
  pageNumber: number,
  meta: WorksheetMeta,
  profile: Pick<SchoolBrandingProfile, "colors">,
): WorksheetElement[] {
  const border = profile.colors.border || "#1e3a5f";
  const elements: WorksheetElement[] = [];

  elements.push({
    id: `page_border_${pageNumber}`,
    type: "shape",
    x: PAGE_FRAME_INSET,
    y: PAGE_FRAME_INSET,
    width: A4_WIDTH - PAGE_FRAME_INSET * 2,
    height: A4_HEIGHT - PAGE_FRAME_INSET * 2,
    shapeKind: "rect",
    stroke: border,
    strokeWidth: 1.5,
    fill: "#ffffff",
    zIndex: 0,
    locked: true,
  });

  elements.push({
    id: `page_border_inner_${pageNumber}`,
    type: "shape",
    x: PAGE_FRAME_INSET + 5,
    y: PAGE_FRAME_INSET + 5,
    width: A4_WIDTH - (PAGE_FRAME_INSET + 5) * 2,
    height: A4_HEIGHT - (PAGE_FRAME_INSET + 5) * 2,
    shapeKind: "rect",
    stroke: border,
    strokeWidth: 0.75,
    fill: "transparent",
    zIndex: 0,
    locked: true,
  });

  if (pageNumber > 1) {
    const fonts = FONT_SIZES_BY_CLASS[meta.classLevel];
    elements.push(
      frameText(
        `page_continuation_${pageNumber}`,
        `Topic – ${meta.topic}`,
        PAGE_MARGIN,
        PAGE_MARGIN + 6,
        {
          fontSize: fonts.prompt,
          fontWeight: "bold",
          textAlign: "center",
          color: profile.colors.title,
          width: A4_WIDTH - PAGE_MARGIN * 2,
        },
      ),
    );
    elements.push({
      id: `page_continuation_rule_${pageNumber}`,
      type: "shape",
      x: PAGE_MARGIN,
      y: PAGE_MARGIN + fonts.prompt + 14,
      width: A4_WIDTH - PAGE_MARGIN * 2,
      height: 1,
      shapeKind: "line",
      stroke: border,
      strokeWidth: 0.75,
      fill: "transparent",
      zIndex: 0,
      locked: true,
    });
  }

  return elements;
}

/** Y offset where question content begins on pages 2+ (below continuation topic bar) */
export function frameContinuationContentStartY(classLevel: WorksheetMeta["classLevel"]): number {
  const fonts = FONT_SIZES_BY_CLASS[classLevel];
  return PAGE_MARGIN + fonts.prompt + 28;
}

export function applyPageFramesToDocument(
  doc: WorksheetDocument,
  profile: Pick<SchoolBrandingProfile, "colors">,
): void {
  for (const page of doc.pages) {
    page.elements = page.elements.filter((el) => !isPageFrameElement(el.id));
    page.elements.unshift(...buildPageFrameElements(page.pageNumber, doc.meta, profile));
    page.elements.sort((a, b) => a.zIndex - b.zIndex);
  }
}

/** Default profile colors when branding not loaded */
export const DEFAULT_FRAME_COLORS: SchoolBrandingProfile["colors"] = {
  primary: "#1e3a5f",
  secondary: "#2a5a8a",
  accent: "#c9a227",
  headerBackground: "#f7f4ef",
  footerBackground: "#f0ebe3",
  border: "#1e3a5f",
  title: "#1e3a5f",
  text: "#222222",
  button: "#1e3a5f",
};

export function defaultFrameProfile(): Pick<SchoolBrandingProfile, "colors"> & { schoolName: string } {
  return { colors: DEFAULT_FRAME_COLORS, schoolName: LPS_SCHOOL_NAME };
}
