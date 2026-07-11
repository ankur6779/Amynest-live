/**
 * Deterministic flow-based worksheet layout.
 * All question blocks are stacked vertically — no arbitrary x/y placement.
 */
import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN, type WorksheetClass, type WorksheetDocument, type WorksheetMeta, type WorksheetPage, type WorksheetQuestionBlock } from "./types.js";
import { FONT_SIZES_BY_CLASS } from "./constants.js";
import { getLpsStandard } from "./lps-standards.js";
import { computeSchoolContentStartY, getActiveBrandingProfile } from "./school-branding.js";
import { frameContinuationContentStartY } from "./page-frame-engine.js";
import { hasActiveFooter } from "./footer-engine.js";
import { isPageFrameElement } from "./page-frame-engine.js";
import type { SchoolBrandingProfile } from "./school-branding.js";

import { LAYOUT } from "./layout-constants.js";

export const FOOTER_RESERVED_HEIGHT = LAYOUT.FOOTER_RESERVED_HEIGHT;
export const CONTENT_WIDTH = LAYOUT.CONTENT_WIDTH;

export interface PageContentRegion {
  top: number;
  bottom: number;
  width: number;
}

export function isDecorativeLayoutElement(id: string): boolean {
  if (isPageFrameElement(id)) return true;
  if (id.startsWith("brand_") || id.startsWith("footer_")) return true;
  return false;
}

/** Usable content band for a page (below header / above footer). */
export function getPageContentRegion(
  pageNumber: number,
  classLevel: WorksheetClass,
  profile: SchoolBrandingProfile = getActiveBrandingProfile(),
): PageContentRegion {
  const metaStub: WorksheetMeta = {
    classLevel,
    title: "",
    topic: "",
    subject: "english",
    difficulty: "easy",
    pageCount: 1,
    colorMode: "color",
    createdAt: "",
    updatedAt: "",
  };
  const top = pageNumber === 1
    ? computeSchoolContentStartY(metaStub, profile)
    : frameContinuationContentStartY(classLevel);
  const bottom = hasActiveFooter(profile)
    ? A4_HEIGHT - PAGE_MARGIN - FOOTER_RESERVED_HEIGHT
    : A4_HEIGHT - PAGE_MARGIN - LAYOUT.BOTTOM_SAFE_ZONE;
  return { top, bottom, width: CONTENT_WIDTH };
}

/** Estimate wrapped text lines at a given width. */
export function estimateWrappedLineCount(text: string, maxWidth: number, fontSize: number): number {
  const charsPerLine = Math.max(12, Math.floor(maxWidth / (fontSize * LAYOUT.CHAR_WIDTH_RATIO)));
  return text.split("\n").reduce((sum, paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return sum + 1;
    return sum + Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  }, 0);
}

/** Auto-height for a question block from its content. */
export function measureQuestionBlockHeight(
  block: Pick<WorksheetQuestionBlock, "prompt" | "options" | "answerLine" | "illustrationSrc" | "illustrationEmoji">,
  classLevel: WorksheetClass,
  contentWidth = CONTENT_WIDTH,
): number {
  const fonts = FONT_SIZES_BY_CLASS[classLevel];
  const standard = getLpsStandard(classLevel);
  const lineH = LAYOUT.LINE_HEIGHT;

  const promptLines = estimateWrappedLineCount(block.prompt, contentWidth, fonts.prompt);
  let h = promptLines * fonts.prompt * lineH + 10;

  if (block.illustrationSrc || block.illustrationEmoji) {
    h += LAYOUT.ILLUSTRATION_SIZE + 12;
  }

  if (block.options?.length) {
    const rows = Math.ceil(block.options.length / 2);
    h += rows * (fonts.body * lineH + LAYOUT.OPTION_ROW_GAP) + LAYOUT.PROMPT_PADDING;
  }

  if (block.answerLine) {
    h += standard.writingAreaMinHeight + 10;
  } else {
    h += 14;
  }

  return Math.ceil(Math.max(h, standard.writingAreaMinHeight + fonts.prompt));
}

/** Internal child positions inside a question block (shared by Fabric + PDF). */
export interface QuestionBlockChildLayout {
  promptTop: number;
  promptHeight: number;
  illustrationTop?: number;
  illustrationSize?: number;
  optionTops: Array<{ top: number; left: number; width: number }>;
  answerLineTop?: number;
  answerLineWidth: number;
  totalHeight: number;
}

export function computeQuestionBlockChildLayout(
  block: Pick<WorksheetQuestionBlock, "prompt" | "options" | "answerLine" | "illustrationSrc" | "illustrationEmoji" | "width">,
  classLevel: WorksheetClass,
): QuestionBlockChildLayout {
  const fonts = FONT_SIZES_BY_CLASS[classLevel];
  const standard = getLpsStandard(classLevel);
  const contentWidth = block.width ?? CONTENT_WIDTH;
  const lineH = LAYOUT.LINE_HEIGHT;
  const colWidth = Math.floor((contentWidth - LAYOUT.OPTION_COL_GAP) / 2);
  const promptLines = estimateWrappedLineCount(block.prompt, contentWidth, fonts.prompt);
  const promptHeight = promptLines * fonts.prompt * lineH;
  let cursor = promptHeight + LAYOUT.PROMPT_PADDING;

  let illustrationTop: number | undefined;
  let illustrationSize: number | undefined;
  if (block.illustrationSrc || block.illustrationEmoji) {
    illustrationTop = cursor;
    illustrationSize = LAYOUT.ILLUSTRATION_SIZE;
    cursor += illustrationSize + LAYOUT.PROMPT_PADDING;
  }

  const optionTops: Array<{ top: number; left: number; width: number }> = [];
  if (block.options?.length) {
    block.options.forEach((_, i) => {
      optionTops.push({
        top: cursor + Math.floor(i / 2) * (fonts.body * lineH + LAYOUT.OPTION_ROW_GAP),
        left: (i % 2) * (colWidth + LAYOUT.OPTION_COL_GAP),
        width: colWidth,
      });
    });
    cursor += Math.ceil(block.options.length / 2) * (fonts.body * lineH + LAYOUT.OPTION_ROW_GAP) + LAYOUT.PROMPT_PADDING;
  }

  let answerLineTop: number | undefined;
  if (block.answerLine) {
    answerLineTop = cursor;
    cursor += standard.writingAreaMinHeight;
  }

  const totalHeight = Math.max(
    measureQuestionBlockHeight(block, classLevel, contentWidth),
    block.width ? cursor + 10 : cursor + 10,
  );

  return {
    promptTop: 0,
    promptHeight,
    illustrationTop,
    illustrationSize,
    optionTops,
    answerLineTop,
    answerLineWidth: Math.min(LAYOUT.ANSWER_LINE_MAX_WIDTH, contentWidth * LAYOUT.ANSWER_LINE_WIDTH_RATIO),
    totalHeight,
  };
}

export interface FlowLayoutOptions {
  maxPages?: number;
  profile?: SchoolBrandingProfile;
}

/** Flow-layout all question blocks onto pages with correct Y stacking. */
export function flowLayoutQuestionBlocks(
  blocks: WorksheetQuestionBlock[],
  meta: WorksheetMeta,
  opts: FlowLayoutOptions = {},
): WorksheetPage[] {
  const profile = opts.profile ?? getActiveBrandingProfile();
  const standard = getLpsStandard(meta.classLevel);
  const maxPages = Math.max(1, opts.maxPages ?? meta.pageCount ?? 4);
  const gap = standard.sectionGap;

  const measured = blocks.map((block) => {
    const height = measureQuestionBlockHeight(block, meta.classLevel);
    return { block, height };
  });

  const pages: Array<Array<WorksheetQuestionBlock>> = [];
  let current: WorksheetQuestionBlock[] = [];
  let pageNum = 1;
  let y = getPageContentRegion(1, meta.classLevel, profile).top;

  for (const { block, height } of measured) {
    const region = getPageContentRegion(pageNum, meta.classLevel, profile);

    if (y + height > region.bottom && current.length > 0) {
      pages.push(current);
      if (pages.length >= maxPages) break;
      pageNum += 1;
      current = [];
      y = getPageContentRegion(pageNum, meta.classLevel, profile).top;
    }

    if (y + height > region.bottom && current.length === 0 && pages.length >= maxPages) {
      break;
    }

    current.push({
      ...block,
      x: PAGE_MARGIN,
      y,
      width: region.width,
      height,
      locked: false,
    });
    y += height + gap;
  }

  if (current.length > 0 && pages.length < maxPages) {
    pages.push(current);
  }

  if (!pages.length) pages.push([]);

  return pages.map((pageBlocks, idx) => ({
    id: `page_flow_${idx + 1}`,
    pageNumber: idx + 1,
    showLpsHeader: idx === 0,
    elements: pageBlocks,
  }));
}

/** Reflow an entire document — preserves decorative elements per page. */
export function reflowDocumentLayout(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  const profile = getActiveBrandingProfile();

  const questions: WorksheetQuestionBlock[] = [];
  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type === "question_block") questions.push(el);
    }
  }

  if (!questions.length) return out;

  const reflowedPages = flowLayoutQuestionBlocks(questions, out.meta, {
    maxPages: Math.max(out.meta.pageCount, out.pages.length, 4),
    profile,
  });

  const brandElements = out.pages[0]?.elements.filter((el) => el.id.startsWith("brand_")) ?? [];

  const rebuilt: WorksheetPage[] = reflowedPages.map((flowPage, idx) => {
    const decorative = idx === 0 ? brandElements : [];
    const content = flowPage.elements.map((el) => ({ ...el, locked: false }));
    return {
      ...flowPage,
      pageNumber: idx + 1,
      showLpsHeader: idx === 0,
      elements: [...decorative, ...content].sort((a, b) => a.zIndex - b.zIndex),
    };
  });

  out.pages = rebuilt;
  out.meta.pageCount = rebuilt.length;
  out.meta.updatedAt = new Date().toISOString();
  return out;
}

/** Validate layout geometry — returns issue codes. */
export function validateLayoutGeometry(doc: WorksheetDocument): string[] {
  const issues: string[] = [];
  const profile = getActiveBrandingProfile();

  for (const page of doc.pages) {
    const region = getPageContentRegion(page.pageNumber, doc.meta.classLevel, profile);
    const questions = page.elements
      .filter((e): e is WorksheetQuestionBlock => e.type === "question_block")
      .sort((a, b) => a.y - b.y);

    for (const q of questions) {
      if (q.y < region.top - 2) {
        issues.push(`Q${q.questionNumber ?? "?"} overlaps header on page ${page.pageNumber}`);
      }
      if (q.y + q.height > region.bottom + 2) {
        issues.push(`Q${q.questionNumber ?? "?"} overflows bottom on page ${page.pageNumber}`);
      }
      if (q.x < PAGE_MARGIN - 2) {
        issues.push(`Q${q.questionNumber ?? "?"} outside left margin`);
      }
      if (q.x + q.width > A4_WIDTH - PAGE_MARGIN + 2) {
        issues.push(`Q${q.questionNumber ?? "?"} outside right margin`);
      }
    }

    for (let i = 1; i < questions.length; i++) {
      const prev = questions[i - 1]!;
      const curr = questions[i]!;
      const minY = prev.y + prev.height + LAYOUT.MIN_BLOCK_GAP;
      if (curr.y < minY - 2) {
        issues.push(`Q${curr.questionNumber ?? "?"} overlaps Q${prev.questionNumber ?? "?"} on page ${page.pageNumber}`);
      }
    }
  }

  return issues;
}
