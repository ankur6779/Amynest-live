import {
  A4_HEIGHT,
  A4_WIDTH,
  PAGE_MARGIN,
  type WorksheetDocument,
  type WorksheetElement,
  type WorksheetMeta,
  type WorksheetPage,
  type WorksheetQuestionBlock,
  type WorksheetTextElement,
} from "../types.js";
import {
  SUBJECT_LABELS,
} from "../constants.js";
import { buildSchoolHeaderElements } from "../header-engine.js";
import { frameContinuationContentStartY } from "../page-frame-engine.js";
import { computeSchoolContentStartY, getActiveBrandingProfile } from "../school-branding.js";
import { measureQuestionBlockHeight, CONTENT_WIDTH } from "../flow-layout-engine.js";

let idCounter = 0;
export function nextId(prefix = "el"): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

function textElement(
  content: string,
  x: number,
  y: number,
  opts: Partial<WorksheetTextElement> = {},
): WorksheetTextElement {
  return {
    id: nextId("txt"),
    type: "text",
    content,
    x,
    y,
    width: opts.width ?? A4_WIDTH - PAGE_MARGIN * 2,
    height: opts.height ?? 30,
    fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? "normal",
    textAlign: opts.textAlign ?? "left",
    color: opts.color ?? "#111111",
    lineHeight: opts.lineHeight ?? 1.4,
    zIndex: opts.zIndex ?? 1,
    locked: opts.locked,
  };
}

/** Official school header — page 1 only (uses active branding profile) */
export function buildLpsHeaderElements(meta: WorksheetMeta): WorksheetElement[] {
  return buildSchoolHeaderElements(meta, getActiveBrandingProfile());
}

export function buildQuestionElement(
  block: Omit<WorksheetQuestionBlock, "id" | "type" | "zIndex"> & { zIndex?: number },
): WorksheetQuestionBlock {
  return {
    id: nextId("q"),
    type: "question_block",
    zIndex: block.zIndex ?? 3,
    ...block,
  };
}

export function createEmptyPage(pageNumber: number, showLpsHeader = false): WorksheetPage {
  return {
    id: nextId("page"),
    pageNumber,
    showLpsHeader,
    elements: [],
  };
}

export function assembleDocument(
  meta: WorksheetMeta,
  pages: WorksheetPage[],
  prompt: string,
  id?: string,
): WorksheetDocument {
  const now = new Date().toISOString();
  return {
    id: id ?? nextId("doc"),
    meta: { ...meta, updatedAt: now, createdAt: meta.createdAt || now },
    pages,
    prompt,
    version: 1,
  };
}

/** Content start Y after school header on page 1 */
export function page1ContentStartY(classLevel: WorksheetMeta["classLevel"]): number {
  return computeSchoolContentStartY(
    { classLevel, title: "", topic: "", subject: "english", difficulty: "easy", pageCount: 1, colorMode: "color", createdAt: "", updatedAt: "" },
    getActiveBrandingProfile(),
  );
}

/** Content start Y for pages 2+ (below continuation topic bar) */
export function continuationContentStartY(classLevel: WorksheetMeta["classLevel"]): number {
  return frameContinuationContentStartY(classLevel);
}

export function estimateQuestionBlockHeight(
  classLevel: WorksheetMeta["classLevel"],
  optionCount = 0,
  hasIllustration = false,
  prompt = "Practice question.",
): number {
  const options = optionCount > 0 ? Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`) : undefined;
  return measureQuestionBlockHeight(
    {
      prompt,
      options,
      illustrationSrc: hasIllustration ? "placeholder" : undefined,
    },
    classLevel,
    CONTENT_WIDTH,
  );
}

export function formatWorksheetTitle(meta: WorksheetMeta): string {
  const subject = SUBJECT_LABELS[meta.subject];
  const suffix = meta.isAnswerKey ? " — Answer Key" : "";
  return `${meta.topic} · ${subject}${suffix}`;
}
