/**
 * WorksheetDocument → LayoutTree integrity audit.
 * Does NOT mutate LayoutTree or Fabric. Identifies first corruption stage.
 */
import { PAGE_MARGIN, type WorksheetDocument, type WorksheetElement, type WorksheetQuestionBlock } from "./types.js";
import { buildLayoutTree, flattenNodes, type LayoutNode, type LayoutNodeKind, type LayoutTree } from "./layout-tree.js";
import { CONTENT_WIDTH } from "./flow-layout-engine.js";
import { assembleDocument, buildLpsHeaderElements, buildQuestionElement, createEmptyPage, nextId, resetIdCounter } from "./renderer/page-layout.js";

const LOG = "[DocLayoutIntegrity]";

export type DocumentDump = {
  documentId: string;
  pages: number;
  questions: number;
  images: number;
  shapes: number;
  texts: number;
  writingLines: number;
  illustrations: number; // question blocks with emoji/src/label
  prompts: string[];
  questionDetails: Array<{
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    prompt: string;
    options: number;
    answerLine: boolean;
    hasIllustration: boolean;
    illustrationEmoji?: string;
    illustrationLabel?: string;
    hasIllustrationSrc: boolean;
  }>;
};

export type LayoutTreeDumpCounts = {
  geometryHash: string;
  pages: number;
  questionBlocks: number;
  prompts: number;
  illustrations: number;
  options: number;
  answerLines: number;
  headers: number;
  footers: number;
  frames: number;
  other: number;
  questionDetails: Array<{
    id: string;
    sourceElementId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    childKinds: string[];
    hasPrompt: boolean;
    hasIllustration: boolean;
    hasAnswerLine: boolean;
    optionCount: number;
  }>;
};

export type IntegrityIssue = {
  stage: "WorksheetDocument" | "LayoutTree" | "Document→LayoutTree";
  code: string;
  message: string;
  sourceId?: string;
};

export type IntegrityAuditResult = {
  ok: boolean;
  firstCorruptionStage: IntegrityIssue["stage"] | null;
  documentDump: DocumentDump;
  layoutDump: LayoutTreeDumpCounts;
  issues: IntegrityIssue[];
  countDiffs: string[];
};

function questionHasIllustration(q: WorksheetQuestionBlock): boolean {
  return !!(q.illustrationSrc || q.illustrationEmoji || q.illustrationLabel);
}

/** STEP 1 — dump WorksheetDocument before LayoutTree. */
export function dumpWorksheetDocument(doc: WorksheetDocument): DocumentDump {
  const questionDetails: DocumentDump["questionDetails"] = [];
  let questions = 0;
  let images = 0;
  let shapes = 0;
  let texts = 0;
  let writingLines = 0;
  let illustrations = 0;
  const prompts: string[] = [];

  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (el.type === "question_block") {
        questions += 1;
        const hasIll = questionHasIllustration(el);
        if (hasIll) illustrations += 1;
        if (el.answerLine) writingLines += 1;
        prompts.push(el.prompt);
        questionDetails.push({
          id: el.id,
          page: page.pageNumber,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          prompt: el.prompt.slice(0, 120),
          options: el.options?.length ?? 0,
          answerLine: !!el.answerLine,
          hasIllustration: hasIll,
          illustrationEmoji: el.illustrationEmoji,
          illustrationLabel: el.illustrationLabel,
          hasIllustrationSrc: !!el.illustrationSrc,
        });
      } else if (el.type === "image") images += 1;
      else if (el.type === "shape") shapes += 1;
      else if (el.type === "text") texts += 1;
    }
  }

  return {
    documentId: doc.id,
    pages: doc.pages.length,
    questions,
    images,
    shapes,
    texts,
    writingLines,
    illustrations,
    prompts,
    questionDetails,
  };
}

/** STEP 2 — dump LayoutTree counts after build. */
export function dumpLayoutTreeCounts(tree: LayoutTree): LayoutTreeDumpCounts {
  let questionBlocks = 0;
  let prompts = 0;
  let illustrations = 0;
  let options = 0;
  let answerLines = 0;
  let headers = 0;
  let footers = 0;
  let frames = 0;
  let other = 0;
  const questionDetails: LayoutTreeDumpCounts["questionDetails"] = [];

  for (const page of tree.pages) {
    for (const node of page.nodes) {
      if (node.kind === "question_block") {
        questionBlocks += 1;
        const childKinds = node.children.map((c) => c.kind);
        const hasPrompt = childKinds.includes("prompt");
        const hasIllustration = childKinds.includes("illustration");
        const hasAnswerLine = childKinds.includes("answer_line");
        const optionCount = childKinds.filter((k) => k === "option").length;
        if (hasPrompt) prompts += 1;
        if (hasIllustration) illustrations += 1;
        if (hasAnswerLine) answerLines += 1;
        options += optionCount;
        questionDetails.push({
          id: node.id,
          sourceElementId: node.sourceElementId,
          x: node.rect.x,
          y: node.rect.y,
          width: node.rect.width,
          height: node.rect.height,
          childKinds,
          hasPrompt,
          hasIllustration,
          hasAnswerLine,
          optionCount,
        });
      } else if (node.kind === "header") headers += 1;
      else if (node.kind === "footer") footers += 1;
      else if (node.kind === "frame") frames += 1;
      else other += 1;
    }
  }

  return {
    geometryHash: tree.geometryHash,
    pages: tree.pages.length,
    questionBlocks,
    prompts,
    illustrations,
    options,
    answerLines,
    headers,
    footers,
    frames,
    other,
    questionDetails,
  };
}

function isFiniteGeom(el: { x: number; y: number; width: number; height: number }): boolean {
  return [el.x, el.y, el.width, el.height].every((n) => Number.isFinite(n) && !Number.isNaN(n));
}

/** Audit document alone (NaN, missing prompts, etc.). */
export function auditWorksheetDocument(doc: WorksheetDocument): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  if (!doc.pages.length) {
    issues.push({ stage: "WorksheetDocument", code: "NO_PAGES", message: "Document has zero pages" });
  }
  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (!isFiniteGeom(el)) {
        issues.push({
          stage: "WorksheetDocument",
          code: "NAN_GEOMETRY",
          message: `Element ${el.id} has NaN/non-finite geometry`,
          sourceId: el.id,
        });
      }
      if (el.width <= 0 || el.height <= 0) {
        issues.push({
          stage: "WorksheetDocument",
          code: "INVALID_SIZE",
          message: `Element ${el.id} has non-positive size ${el.width}x${el.height}`,
          sourceId: el.id,
        });
      }
      if (el.type === "question_block") {
        if (!el.prompt?.trim()) {
          issues.push({
            stage: "WorksheetDocument",
            code: "EMPTY_PROMPT",
            message: `Question ${el.id} has empty prompt`,
            sourceId: el.id,
          });
        }
        if (el.prompt === undefined) {
          issues.push({
            stage: "WorksheetDocument",
            code: "UNDEFINED_PROMPT",
            message: `Question ${el.id} prompt is undefined`,
            sourceId: el.id,
          });
        }
      }
    }
  }
  return issues;
}

/**
 * Full integrity audit: Document → LayoutTree.
 * Stops conceptually at first corruption stage (reports firstCorruptionStage).
 */
export function auditDocumentToLayoutTree(doc: WorksheetDocument): IntegrityAuditResult {
  const documentDump = dumpWorksheetDocument(doc);
  console.groupCollapsed(`${LOG} STEP1 WorksheetDocument`);
  console.log({
    id: documentDump.documentId,
    pages: documentDump.pages,
    questions: documentDump.questions,
    images: documentDump.images,
    shapes: documentDump.shapes,
    texts: documentDump.texts,
    writingLines: documentDump.writingLines,
    illustrations: documentDump.illustrations,
  });
  console.table(documentDump.questionDetails);
  console.groupEnd();

  const docIssues = auditWorksheetDocument(doc);
  if (docIssues.length) {
    for (const i of docIssues) console.error(`${LOG} STEP1 FAIL`, i);
    return {
      ok: false,
      firstCorruptionStage: "WorksheetDocument",
      documentDump,
      layoutDump: {
        geometryHash: "",
        pages: 0,
        questionBlocks: 0,
        prompts: 0,
        illustrations: 0,
        options: 0,
        answerLines: 0,
        headers: 0,
        footers: 0,
        frames: 0,
        other: 0,
        questionDetails: [],
      },
      issues: docIssues,
      countDiffs: [],
    };
  }

  const tree = buildLayoutTree(doc);
  const layoutDump = dumpLayoutTreeCounts(tree);
  console.groupCollapsed(`${LOG} STEP2 LayoutTree`);
  console.log({
    geometryHash: layoutDump.geometryHash,
    pages: layoutDump.pages,
    questionBlocks: layoutDump.questionBlocks,
    prompts: layoutDump.prompts,
    illustrations: layoutDump.illustrations,
    options: layoutDump.options,
    answerLines: layoutDump.answerLines,
  });
  console.table(layoutDump.questionDetails);
  console.groupEnd();

  const issues: IntegrityIssue[] = [];
  const countDiffs: string[] = [];

  if (documentDump.pages !== layoutDump.pages) {
    countDiffs.push(`pages: doc=${documentDump.pages} tree=${layoutDump.pages}`);
  }
  if (documentDump.questions !== layoutDump.questionBlocks) {
    countDiffs.push(`questions: doc=${documentDump.questions} tree=${layoutDump.questionBlocks}`);
  }
  if (documentDump.writingLines !== layoutDump.answerLines) {
    countDiffs.push(`writingLines: doc=${documentDump.writingLines} tree=${layoutDump.answerLines}`);
  }

  // Illustrations: LayoutTree only emits illustration when emoji OR src exists (not label-only).
  const docIllWithRenderable = documentDump.questionDetails.filter(
    (q) => q.hasIllustrationSrc || !!q.illustrationEmoji,
  ).length;
  if (docIllWithRenderable !== layoutDump.illustrations) {
    countDiffs.push(
      `illustrations(renderable emoji|src): doc=${docIllWithRenderable} tree=${layoutDump.illustrations}`,
    );
  }

  // Label-only illustrations disappear in LayoutTree — report as Document→LayoutTree drop.
  for (const q of documentDump.questionDetails) {
    if (q.illustrationLabel && !q.hasIllustrationSrc && !q.illustrationEmoji) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "ILLUSTRATION_LABEL_DROPPED",
        message: `Question ${q.id} has illustrationLabel="${q.illustrationLabel}" but no emoji/src — LayoutTree omits illustration child`,
        sourceId: q.id,
      });
    }
  }

  if (countDiffs.length) {
    console.error(`${LOG} STEP2 COUNT MISMATCH — STOP`, countDiffs);
    for (const d of countDiffs) {
      issues.push({ stage: "Document→LayoutTree", code: "COUNT_MISMATCH", message: d });
    }
  }

  // STEP 3 — every question block children
  for (const q of documentDump.questionDetails) {
    const lt = layoutDump.questionDetails.find((n) => n.sourceElementId === q.id);
    if (!lt) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "QUESTION_MISSING_IN_TREE",
        message: `Document question ${q.id} missing from LayoutTree`,
        sourceId: q.id,
      });
      continue;
    }
    if (!lt.hasPrompt) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "PROMPT_CHILD_MISSING",
        message: `LayoutTree question ${lt.id} missing prompt child. Source prompt="${q.prompt}"`,
        sourceId: q.id,
      });
    }
    if ((q.hasIllustrationSrc || q.illustrationEmoji) && !lt.hasIllustration) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "ILLUSTRATION_CHILD_MISSING",
        message: `LayoutTree question ${lt.id} missing illustration child despite document emoji/src`,
        sourceId: q.id,
      });
    }
    if (q.answerLine && !lt.hasAnswerLine) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "ANSWER_LINE_CHILD_MISSING",
        message: `LayoutTree question ${lt.id} missing answer_line child`,
        sourceId: q.id,
      });
    }
    if (q.options !== lt.optionCount) {
      issues.push({
        stage: "Document→LayoutTree",
        code: "OPTIONS_COUNT_MISMATCH",
        message: `Question ${q.id} options doc=${q.options} tree=${lt.optionCount}`,
        sourceId: q.id,
      });
    }
    if (!isFiniteGeom(lt)) {
      issues.push({
        stage: "LayoutTree",
        code: "NAN_GEOMETRY",
        message: `LayoutTree node ${lt.id} has non-finite geometry`,
        sourceId: lt.id,
      });
    }
  }

  const hardCountFail =
    documentDump.questions !== layoutDump.questionBlocks ||
    documentDump.pages !== layoutDump.pages;

  if (hardCountFail) {
    return {
      ok: false,
      firstCorruptionStage: "Document→LayoutTree",
      documentDump,
      layoutDump,
      issues,
      countDiffs,
    };
  }

  const first = issues[0] ?? null;
  return {
    ok: issues.length === 0,
    firstCorruptionStage: first?.stage ?? null,
    documentDump,
    layoutDump,
    issues,
    countDiffs,
  };
}

/**
 * Fail-fast gate before any render. Throws in non-production when integrity fails hard.
 */
export function assertDocumentLayoutIntegrity(doc: WorksheetDocument): IntegrityAuditResult {
  const result = auditDocumentToLayoutTree(doc);
  const hard = result.issues.filter((i) =>
    i.code === "COUNT_MISMATCH" ||
    i.code === "QUESTION_MISSING_IN_TREE" ||
    i.code === "PROMPT_CHILD_MISSING" ||
    i.code === "NAN_GEOMETRY" ||
    i.code === "EMPTY_PROMPT" ||
    i.code === "UNDEFINED_PROMPT" ||
    i.code === "NO_PAGES" ||
    i.code === "ILLUSTRATION_CHILD_MISSING" ||
    i.code === "ANSWER_LINE_CHILD_MISSING"
  );
  if (hard.length && typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    const first = hard[0]!;
    console.error(`${LOG} FAIL FAST at ${first.stage}:`, first);
    throw new Error(`[DocLayoutIntegrity] ${first.stage}: ${first.message}`);
  }
  return result;
}

/**
 * STEP 5 — completely static worksheet. NO AI. Hardcoded geometry.
 * Used to isolate Document/LayoutTree vs renderer.
 */
export function buildStaticIntegrityWorksheet(): WorksheetDocument {
  resetIdCounter();
  const now = "2026-01-01T00:00:00.000Z";
  const meta = {
    title: "Static Integrity Worksheet",
    topic: "Integrity Audit",
    classLevel: "ukg" as const,
    subject: "english" as const,
    difficulty: "easy" as const,
    pageCount: 1,
    colorMode: "color" as const,
    createdAt: now,
    updatedAt: now,
  };

  const page = createEmptyPage(1, true);
  const header = buildLpsHeaderElements(meta);
  const contentTop = 200;
  const gap = 16;
  const qWidth = CONTENT_WIDTH;
  const qHeight = 100;

  const q1 = buildQuestionElement({
    questionNumber: 1,
    questionType: "circle",
    prompt: "1. Circle the fish.",
    options: ["Fish", "Cat", "Dog", "Bird"],
    illustrationEmoji: "🐟",
    illustrationLabel: "fish",
    x: PAGE_MARGIN,
    y: contentTop,
    width: qWidth,
    height: qHeight,
  });
  const q2 = buildQuestionElement({
    questionNumber: 2,
    questionType: "fill_blank",
    prompt: "2. Write the beginning sound: ___",
    answerLine: true,
    illustrationEmoji: "⭐",
    illustrationLabel: "star",
    x: PAGE_MARGIN,
    y: contentTop + qHeight + gap,
    width: qWidth,
    height: qHeight,
  });
  const q3 = buildQuestionElement({
    questionNumber: 3,
    questionType: "tick",
    prompt: "3. Tick the correct word.",
    options: ["Sun", "Moon"],
    answerLine: false,
    x: PAGE_MARGIN,
    y: contentTop + (qHeight + gap) * 2,
    width: qWidth,
    height: qHeight,
  });
  const q4 = buildQuestionElement({
    questionNumber: 4,
    questionType: "writing",
    prompt: "4. Trace and write the word.",
    answerLine: true,
    illustrationEmoji: "✏️",
    x: PAGE_MARGIN,
    y: contentTop + (qHeight + gap) * 3,
    width: qWidth,
    height: qHeight,
  });

  const standaloneImage: WorksheetElement = {
    id: nextId("img"),
    type: "image",
    x: PAGE_MARGIN,
    y: contentTop + (qHeight + gap) * 4,
    width: 56,
    height: 56,
    src: "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><circle cx="28" cy="28" r="20" fill="none" stroke="#111" stroke-width="2"/></svg>`,
    ),
    zIndex: 4,
  };

  page.elements = [...header, q1, q2, q3, q4, standaloneImage];

  return assembleDocument(meta, [page], "static integrity worksheet — no AI");
}

/** Stage dump for visual/JSON comparison (STEP 6). */
export function buildStageDumps(doc: WorksheetDocument): {
  stage1_document: DocumentDump;
  stage2_layoutTree: LayoutTreeDumpCounts;
  audit: IntegrityAuditResult;
  layoutTree: LayoutTree;
} {
  const audit = auditDocumentToLayoutTree(doc);
  const layoutTree = buildLayoutTree(doc);
  return {
    stage1_document: audit.documentDump,
    stage2_layoutTree: audit.layoutDump,
    audit,
    layoutTree,
  };
}

/** Compare a question element's expected children against a LayoutNode. */
export function expectedChildrenForQuestion(q: WorksheetQuestionBlock): LayoutNodeKind[] {
  const kinds: LayoutNodeKind[] = ["prompt"];
  if (q.illustrationSrc || q.illustrationEmoji) kinds.push("illustration");
  if (q.options?.length) {
    for (let i = 0; i < q.options.length; i++) kinds.push("option");
  }
  if (q.answerLine) kinds.push("answer_line");
  return kinds;
}

export function findMissingLayoutChildren(doc: WorksheetDocument, tree: LayoutTree): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const bySource = new Map<string, LayoutNode>();
  for (const page of tree.pages) {
    for (const n of page.nodes) {
      if (n.kind === "question_block") bySource.set(n.sourceElementId, n);
    }
  }
  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (el.type !== "question_block") continue;
      const node = bySource.get(el.id);
      if (!node) continue;
      const expected = expectedChildrenForQuestion(el);
      const actual = node.children.map((c) => c.kind);
      for (const kind of expected) {
        if (kind === "option") continue;
        if (!actual.includes(kind)) {
          issues.push({
            stage: "Document→LayoutTree",
            code: "CHILD_MISSING",
            message: `Expected child kind "${kind}" missing for ${el.id}. Actual=[${actual.join(",")}] Source=${JSON.stringify({
              prompt: el.prompt,
              options: el.options,
              answerLine: el.answerLine,
              illustrationEmoji: el.illustrationEmoji,
              illustrationSrc: !!el.illustrationSrc,
            })}`,
            sourceId: el.id,
          });
        }
      }
      const expectedOpts = el.options?.length ?? 0;
      const actualOpts = actual.filter((k) => k === "option").length;
      if (expectedOpts !== actualOpts) {
        issues.push({
          stage: "Document→LayoutTree",
          code: "CHILD_MISSING",
          message: `Options expected=${expectedOpts} actual=${actualOpts} for ${el.id}`,
          sourceId: el.id,
        });
      }
    }
  }
  return issues;
}

export { flattenNodes };
