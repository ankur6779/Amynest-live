import { PAGE_MARGIN, type WorksheetMeta, type WorksheetQuestionBlock } from "./types.js";
import { paginateQuestions, type PaginatedBlock } from "./pagination.js";
import { getLpsStandard } from "./lps-standards.js";
import { measureQuestionBlockHeight, CONTENT_WIDTH } from "./flow-layout-engine.js";

export interface LayoutBlock extends PaginatedBlock {
  hasIllustration?: boolean;
  keepTogether?: boolean;
}

export function layoutQuestionBlocks(
  blocks: LayoutBlock[],
  meta: WorksheetMeta,
  page1StartY: number,
  continuationStartY: number,
  maxPages: number,
): Array<Array<WorksheetQuestionBlock & { x: number; y: number }>> {
  const standard = getLpsStandard(meta.classLevel);
  const gap = standard.sectionGap;

  const enriched: PaginatedBlock[] = blocks.map((b) => ({
    block: b.block,
    height: measureQuestionBlockHeight(
      {
        prompt: b.block.prompt,
        options: b.block.options,
        answerLine: b.block.answerLine,
        illustrationSrc: b.block.illustrationSrc,
        illustrationEmoji: b.block.illustrationEmoji,
      },
      meta.classLevel,
      CONTENT_WIDTH,
    ) + (b.keepTogether ? 8 : 0),
  }));

  const rawPages = paginateQuestions(enriched, meta, page1StartY, continuationStartY, maxPages);

  return rawPages.map((pageBlocks, pageIdx) => {
    const startY = pageIdx === 0 ? page1StartY : continuationStartY;
    let y = startY;
    return pageBlocks.map((b) => {
      const positioned = {
        ...b,
        x: PAGE_MARGIN,
        y,
        width: CONTENT_WIDTH,
        type: "question_block" as const,
        zIndex: 3,
        locked: false,
      };
      y += b.height + gap;
      return positioned;
    });
  });
}
