import { A4_HEIGHT, PAGE_MARGIN, type WorksheetQuestionBlock } from "./types.js";
import type { WorksheetMeta } from "./types.js";
import { FOOTER_RESERVED_HEIGHT, CONTENT_WIDTH } from "./flow-layout-engine.js";

const QUESTION_GAP = 20;

/** Shuffle array in place (Fisher–Yates) */
export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Deduplicate question prompts */
export function dedupePrompts<T extends { prompt: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.prompt.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface PaginatedBlock {
  block: Omit<WorksheetQuestionBlock, "id" | "type" | "zIndex" | "x" | "y">;
  height: number;
}

/**
 * Flow-based pagination — never clip; move whole blocks to next page.
 */
export function paginateQuestions(
  blocks: PaginatedBlock[],
  meta: WorksheetMeta,
  page1StartY: number,
  continuationStartY: number,
  maxPages: number,
): Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> {
  const pages: Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> = [];
  let pageNum = 1;
  let y = page1StartY;
  let currentPage: Array<WorksheetQuestionBlock & { x: number; y: number }> = [];

  const bottomSafe = FOOTER_RESERVED_HEIGHT;
  const maxY = A4_HEIGHT - PAGE_MARGIN - bottomSafe;

  const startYForPage = (n: number) => (n === 1 ? page1StartY : continuationStartY);

  for (const { block, height } of blocks) {
    const pageStart = startYForPage(pageNum);
    if (pageNum > 1 && y < pageStart) y = pageStart;

    if (y + height > maxY) {
      if (currentPage.length) {
        pages.push(currentPage);
        if (pages.length >= maxPages) {
          currentPage = [{ ...block, type: "question_block", zIndex: 3, x: PAGE_MARGIN, y: pageStart, width: CONTENT_WIDTH, height } as WorksheetQuestionBlock & { x: number; y: number }];
          break;
        }
        pageNum += 1;
        currentPage = [];
        y = startYForPage(pageNum);
      }
    }

    currentPage.push({
      ...block,
      type: "question_block",
      zIndex: 3,
      x: PAGE_MARGIN,
      y,
      width: CONTENT_WIDTH,
      height,
    } as WorksheetQuestionBlock & { x: number; y: number });

    y += height + QUESTION_GAP;
  }

  if (currentPage.length && pages.length < maxPages) {
    pages.push(currentPage);
  }

  void meta;
  return pages.length ? pages : [[]];
}

export function randomizeOptions(options?: string[]): string[] | undefined {
  if (!options?.length) return options;
  return shuffleInPlace([...options]);
}
