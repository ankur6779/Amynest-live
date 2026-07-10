import type {
  QuestionType,
  ReconstructionStyle,
  WorksheetDocument,
  WorksheetElement,
  WorksheetMeta,
  WorksheetPage,
  WorksheetReconstructRequest,
  WorksheetShapeElement,
  WorksheetTextElement,
} from "./types.js";
import { A4_WIDTH, PAGE_MARGIN } from "./types.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { layoutQuestionBlocks } from "./layout-engine.js";
import { finalizeWorksheet } from "./worksheet-pipeline.js";
import { reconstructWorksheetLocal } from "./reconstruction-engine.js";
import {
  assembleDocument,
  buildLpsHeaderElements,
  buildQuestionElement,
  continuationContentStartY,
  createEmptyPage,
  estimateQuestionBlockHeight,
  nextId,
  page1ContentStartY,
  resetIdCounter,
} from "./renderer/page-layout.js";

const VALID_TYPES = new Set<string>([
  "colour", "circle", "match", "trace", "draw", "join", "tick", "cross",
  "cut_paste", "fill_blank", "missing_letters", "beginning_sounds", "odd_one_out",
  "count", "pattern", "sorting", "picture_recognition", "reading", "short_sentences",
  "phonics", "writing", "math", "evs", "hindi",
]);

interface AiElementJson {
  kind: string;
  content?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  number?: number;
  type?: string;
  prompt?: string;
  options?: string[];
  answerLine?: boolean;
  illustrationLabel?: string;
  shapeKind?: "rect" | "circle" | "line" | "triangle";
  stroke?: string;
  count?: number;
}

interface AiPageJson {
  elements?: AiElementJson[];
}

interface AiReconstructionJson {
  title?: string;
  topic?: string;
  pages?: AiPageJson[];
  uncertainAreas?: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function buildTextEl(el: AiElementJson, z: number): WorksheetTextElement {
  return {
    id: nextId("txt"),
    type: "text",
    content: el.content ?? "",
    x: clamp(el.x ?? PAGE_MARGIN, 0, A4_WIDTH - 40),
    y: clamp(el.y ?? PAGE_MARGIN, 0, 842),
    width: clamp(el.width ?? A4_WIDTH - PAGE_MARGIN * 2, 80, A4_WIDTH - PAGE_MARGIN * 2),
    height: el.height ?? 28,
    fontSize: el.fontSize ?? 14,
    fontWeight: el.fontWeight ?? "normal",
    textAlign: el.textAlign ?? "left",
    color: "#111111",
    zIndex: z,
  };
}

function buildWritingLines(el: AiElementJson, z: number): WorksheetShapeElement[] {
  const x = clamp(el.x ?? PAGE_MARGIN, PAGE_MARGIN, A4_WIDTH - 100);
  const y = clamp(el.y ?? 400, 80, 780);
  const width = clamp(el.width ?? 400, 120, A4_WIDTH - PAGE_MARGIN * 2);
  const count = clamp(el.count ?? 3, 1, 8);
  const lines: WorksheetShapeElement[] = [];
  for (let i = 0; i < count; i++) {
    lines.push({
      id: nextId("line"),
      type: "shape",
      shapeKind: "line",
      x,
      y: y + i * 28,
      width,
      height: 2,
      stroke: "#333333",
      strokeWidth: 1,
      fill: "transparent",
      zIndex: z,
    });
  }
  return lines;
}

function buildShapeEl(el: AiElementJson, z: number): WorksheetShapeElement {
  return {
    id: nextId("shp"),
    type: "shape",
    shapeKind: el.shapeKind ?? "rect",
    x: clamp(el.x ?? PAGE_MARGIN, 0, A4_WIDTH - 40),
    y: clamp(el.y ?? 200, 0, 780),
    width: clamp(el.width ?? 200, 20, A4_WIDTH - PAGE_MARGIN * 2),
    height: clamp(el.height ?? 60, 10, 400),
    stroke: el.stroke ?? "#111111",
    strokeWidth: 2,
    fill: "transparent",
    zIndex: z,
  };
}

function applyStyleToMeta(meta: WorksheetMeta, style: ReconstructionStyle): WorksheetMeta {
  switch (style) {
    case "low_ink":
      return { ...meta, colorMode: "bw" };
    case "color":
      return { ...meta, colorMode: "color" };
    case "assessment":
      return { ...meta, isAnswerKey: false };
    case "homework":
      return { ...meta, difficulty: meta.difficulty === "hard" ? "medium" : meta.difficulty };
    default:
      return meta;
  }
}

function mapPageElements(elements: AiElementJson[], classLevel: WorksheetMeta["classLevel"]): {
  direct: WorksheetElement[];
  questionBlocks: Array<{
    block: Omit<import("./types.js").WorksheetQuestionBlock, "id" | "type" | "zIndex" | "x" | "y">;
    height: number;
    hasIllustration: boolean;
  }>;
} {
  const direct: WorksheetElement[] = [];
  const questionBlocks: Array<{
    block: Omit<import("./types.js").WorksheetQuestionBlock, "id" | "type" | "zIndex" | "x" | "y">;
    height: number;
    hasIllustration: boolean;
  }> = [];
  let z = 2;
  for (const el of elements) {
    if (el.kind === "text" && el.content) {
      direct.push(buildTextEl(el, z++));
    } else if (el.kind === "writing_lines") {
      direct.push(...buildWritingLines(el, z++));
    } else if (el.kind === "shape") {
      direct.push(buildShapeEl(el, z++));
    } else if (el.kind === "question" && el.prompt) {
      const label = el.illustrationLabel ?? el.prompt;
      const illSrc = el.illustrationLabel ? getIllustration(detectIllustrationFromText(label)) : undefined;
      const qType = VALID_TYPES.has(el.type ?? "") ? (el.type as QuestionType) : "fill_blank";
      const height = estimateQuestionBlockHeight(classLevel, el.options?.length ?? 0, Boolean(illSrc));
      questionBlocks.push({
        block: {
          questionNumber: el.number ?? questionBlocks.length + 1,
          questionType: qType,
          prompt: el.prompt,
          options: el.options,
          answerLine: el.answerLine,
          illustrationLabel: el.illustrationLabel,
          illustrationSrc: illSrc,
          width: 555,
          height,
        },
        height,
        hasIllustration: Boolean(illSrc),
      });
    }
  }
  return { direct, questionBlocks };
}

export function parseReconstructionResponse(
  raw: unknown,
  req: WorksheetReconstructRequest,
  fallback: WorksheetDocument,
): { document: WorksheetDocument; uncertainAreas: string[] } {
  if (!raw || typeof raw !== "object") {
    return { document: fallback, uncertainAreas: ["AI response invalid — used offline reconstruction"] };
  }

  const json = raw as AiReconstructionJson;
  const pagesJson = Array.isArray(json.pages) ? json.pages : [];
  if (pagesJson.length === 0) {
    return { document: fallback, uncertainAreas: json.uncertainAreas ?? ["No pages in AI response"] };
  }

  resetIdCounter();
  const topic = json.topic ?? req.topic ?? req.analysis?.topic ?? "Reconstructed Worksheet";
  const meta: WorksheetMeta = applyStyleToMeta(
    {
      title: json.title ?? topic,
      topic,
      classLevel: req.classLevel,
      subject: req.subject,
      difficulty: req.difficulty,
      pageCount: Math.min(4, req.pageCount ?? req.analysis?.pageCount ?? pagesJson.length),
      colorMode: req.style === "low_ink" ? "bw" : "color",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    req.style,
  );

  const allQuestionBlocks: Array<{
    block: Omit<import("./types.js").WorksheetQuestionBlock, "id" | "type" | "zIndex" | "x" | "y">;
    height: number;
    hasIllustration: boolean;
    keepTogether?: boolean;
  }> = [];
  const directByPage: WorksheetElement[][] = [];

  for (const page of pagesJson) {
    const els = Array.isArray(page.elements) ? page.elements : [];
    const mapped = mapPageElements(els, meta.classLevel);
    directByPage.push(mapped.direct);
    for (const qb of mapped.questionBlocks) {
      allQuestionBlocks.push({ ...qb, keepTogether: qb.hasIllustration });
    }
  }

  let pages: WorksheetPage[];
  if (allQuestionBlocks.length > 0) {
    const paginated = layoutQuestionBlocks(
      allQuestionBlocks.map((b) => ({
        block: b.block,
        height: b.height,
        hasIllustration: b.hasIllustration,
        keepTogether: b.keepTogether ?? false,
      })),
      meta,
      page1ContentStartY(meta.classLevel),
      continuationContentStartY(meta.classLevel),
      meta.pageCount,
    );
    pages = paginated.map((pageBlocks, idx) => {
      const page = createEmptyPage(idx + 1, idx === 0);
      if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
      if (directByPage[idx]) page.elements.push(...directByPage[idx]!);
      let qNum = 0;
      for (const b of pageBlocks) {
        qNum += 1;
        page.elements.push(
          buildQuestionElement({
            ...b,
            questionNumber: qNum,
            prompt: `Question ${qNum}. ${b.prompt.replace(/^Question \d+\.\s*/, "")}`,
          }),
        );
      }
      return page;
    });
  } else {
    pages = pagesJson.map((pageJson, idx) => {
      const page = createEmptyPage(idx + 1, idx === 0);
      if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
      const els = Array.isArray(pageJson.elements) ? pageJson.elements : [];
      const mapped = mapPageElements(els, meta.classLevel);
      page.elements.push(...mapped.direct);
      for (const qb of mapped.questionBlocks) {
        page.elements.push(buildQuestionElement({
          ...qb.block,
          x: PAGE_MARGIN,
          y: page1ContentStartY(meta.classLevel) + mapped.questionBlocks.indexOf(qb) * (qb.height + 24),
        }));
      }
      return page;
    });
  }

  const doc = assembleDocument(meta, pages, `Reconstructed: ${topic}`, nextId("doc"));
  return {
    document: finalizeWorksheet(doc).document,
    uncertainAreas: json.uncertainAreas ?? [],
  };
}

export function buildReconstructionFallback(req: WorksheetReconstructRequest): WorksheetDocument {
  return reconstructWorksheetLocal(req).document;
}
