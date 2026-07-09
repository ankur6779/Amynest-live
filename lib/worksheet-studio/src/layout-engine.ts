import { A4_HEIGHT, PAGE_MARGIN, type WorksheetMeta, type WorksheetQuestionBlock } from "./types.js";
import { paginateQuestions, type PaginatedBlock } from "./pagination.js";

const SECTION_GAP = 24;

export interface LayoutBlock extends PaginatedBlock {
  hasIllustration?: boolean;
  keepTogether?: boolean;
}

function blockTotalHeight(block: LayoutBlock): number {
  return block.height + (block.hasIllustration ? 72 : 0);
}

export function layoutQuestionBlocks(
  blocks: LayoutBlock[],
  meta: WorksheetMeta,
  page1StartY: number,
  continuationStartY: number,
  maxPages: number,
): Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> {
  const enriched: PaginatedBlock[] = blocks.map((b) => ({
    block: b.block,
    height: blockTotalHeight(b) + (b.keepTogether ? 8 : 0),
  }));

  const rawPages = paginateQuestions(enriched, meta, page1StartY, continuationStartY, maxPages);

  const spaced = rawPages.map((pageBlocks, pageIdx) => {
    const startY = pageIdx === 0 ? page1StartY : continuationStartY;
    const usedHeight = pageBlocks.reduce((sum, b) => sum + b.height + SECTION_GAP, 0);
    const freeSpace = A4_HEIGHT - PAGE_MARGIN - 48 - startY - usedHeight;
    const extraGap = pageBlocks.length > 1 ? Math.min(12, Math.floor(freeSpace / pageBlocks.length)) : 0;
    let y = startY;
    return pageBlocks.map((b) => {
      const positioned = { ...b, x: PAGE_MARGIN, y, type: "question_block" as const, zIndex: 3 };
      y += b.height + SECTION_GAP + extraGap;
      return positioned;
    });
  });

  return balancePageDensity(spaced, meta, page1StartY, continuationStartY);
}

/** V2 — redistribute blocks to avoid sparse or overcrowded pages. */
function balancePageDensity(
  pages: Array<Array<WorksheetQuestionBlock & { x: number; y: number }>>,
  meta: WorksheetMeta,
  page1StartY: number,
  continuationStartY: number,
): Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> {
  if (pages.length <= 1) return pages;

  const maxY = A4_HEIGHT - PAGE_MARGIN - 48;
  const densities = pages.map((p) => {
    const used = p.reduce((sum, b) => sum + b.height, 0);
    const capacity = maxY - (p === pages[0] ? page1StartY : continuationStartY);
    return { used, capacity, ratio: used / Math.max(1, capacity) };
  });

  const allBlocks = pages.flat();
  const avgRatio = densities.reduce((s, d) => s + d.ratio, 0) / densities.length;

  if (densities.every((d) => d.ratio >= 0.45 && d.ratio <= 0.88)) {
    return pages;
  }

  const targetPerPage = Math.ceil(allBlocks.length / pages.length);
  const redistributed: typeof pages = [];
  let idx = 0;

  for (let p = 0; p < pages.length; p++) {
    const slice = allBlocks.slice(idx, idx + targetPerPage);
    idx += slice.length;
    if (!slice.length) continue;
    const startY = p === 0 ? page1StartY : continuationStartY;
    let y = startY;
    const gap = meta.classLevel === "nursery" ? 28 : meta.classLevel === "grade2" ? 20 : 24;
    redistributed.push(
      slice.map((b) => {
        const positioned = { ...b, y };
        y += b.height + gap;
        return positioned;
      }),
    );
  }

  if (idx < allBlocks.length && redistributed.length) {
    const last = redistributed[redistributed.length - 1]!;
    let y = last.length ? last[last.length - 1]!.y + last[last.length - 1]!.height + 24 : continuationStartY;
    for (const b of allBlocks.slice(idx)) {
      if (y + b.height > maxY) break;
      last.push({ ...b, y });
      y += b.height + 24;
    }
  }

  void avgRatio;
  return redistributed.length ? redistributed : pages;
}
