import { A4_HEIGHT, PAGE_MARGIN, type WorksheetQuestionBlock } from "./types.js";
import type { WorksheetMeta } from "./types.js";

const QUESTION_GAP = 20;
const BOTTOM_SAFE = 48;

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
 * Intelligently paginate questions — never clip inside page bounds.
 * Returns array of pages, each page is array of positioned blocks.
 */
export function paginateQuestions(
  blocks: PaginatedBlock[],
  meta: WorksheetMeta,
  page1StartY: number,
  continuationStartY: number,
  maxPages: number,
): Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> {
  const pages: Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> = [];
  let y = page1StartY;
  let currentPage: Array<WorksheetQuestionBlock & { x: number; y: number }> = [];
  let onFirstPage = true;

  const maxY = A4_HEIGHT - PAGE_MARGIN - BOTTOM_SAFE;

  for (const { block, height } of blocks) {
    if (y + height > maxY) {
      if (currentPage.length) pages.push(currentPage);
      currentPage = [];
      y = continuationStartY;
      onFirstPage = false;
    }

    currentPage.push({
      ...block,
      type: "question_block",
      zIndex: 3,
      x: PAGE_MARGIN,
      y,
      width: 555,
      height,
    } as WorksheetQuestionBlock & { x: number; y: number });

    y += height + QUESTION_GAP;
  }

  if (currentPage.length) pages.push(currentPage);

  void meta;
  void maxPages;
  void onFirstPage;
  return pages.length ? pages : [[]];
}

export function randomizeOptions(options?: string[]): string[] | undefined {
  if (!options?.length) return options;
  return shuffleInPlace([...options]);
}
