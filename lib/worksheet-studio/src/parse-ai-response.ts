import type {
  WorksheetDocument,
  WorksheetGenerateRequest,
  WorksheetMeta,
  WorksheetPage,
} from "./types.js";
import {
  assembleDocument,
  buildLpsHeaderElements,
  buildQuestionElement,
  continuationContentStartY,
  createEmptyPage,
  estimateQuestionBlockHeight,
  page1ContentStartY,
  resetIdCounter,
} from "./renderer/page-layout.js";
import { layoutQuestionBlocks } from "./layout-engine.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { finalizeWorksheet } from "./worksheet-pipeline.js";
import { generateWorksheetLocal } from "./local-generator.js";

interface AiQuestionJson {
  type: string;
  prompt: string;
  options?: string[];
  answerLine?: boolean;
  illustrationEmoji?: string;
  illustrationLabel?: string;
  answer?: string;
}

interface AiWorksheetJson {
  title?: string;
  topic?: string;
  questions?: AiQuestionJson[];
}

const VALID_TYPES = new Set([
  "colour", "circle", "match", "trace", "draw", "join", "tick", "cross",
  "cut_paste", "fill_blank", "missing_letters", "beginning_sounds", "odd_one_out",
  "count", "pattern", "sorting", "picture_recognition", "reading", "short_sentences",
  "phonics", "writing", "math", "evs", "hindi",
]);

export function parseAiWorksheetResponse(
  raw: unknown,
  req: WorksheetGenerateRequest,
  fallback: WorksheetDocument,
): WorksheetDocument {
  if (!raw || typeof raw !== "object") return fallback;

  const json = raw as AiWorksheetJson;
  const questions = Array.isArray(json.questions) ? json.questions : [];
  if (questions.length === 0) return fallback;

  resetIdCounter();

  const meta: WorksheetMeta = {
    title: json.title ?? req.prompt,
    topic: json.topic ?? req.prompt,
    classLevel: req.classLevel,
    subject: req.subject,
    difficulty: req.difficulty,
    pageCount: req.pageCount,
    colorMode: "color",
    isAnswerKey: req.answerKey ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const blocks = questions.map((q, i) => {
    const prompt = q.prompt;
    const label = q.illustrationLabel ?? prompt;
    const detected = detectIllustrationFromText(label);
    const illustrationSrc = q.illustrationEmoji || q.illustrationLabel
      ? getIllustration(detected)
      : undefined;
    const height = estimateQuestionBlockHeight(
      meta.classLevel,
      q.options?.length ?? 0,
      Boolean(illustrationSrc),
    );
    return {
      block: {
        questionNumber: i + 1,
        questionType: VALID_TYPES.has(q.type) ? (q.type as import("./types.js").QuestionType) : "fill_blank",
        prompt,
        options: q.options,
        answerLine: q.answerLine,
        illustrationEmoji: q.illustrationEmoji,
        illustrationLabel: q.illustrationLabel,
        illustrationSrc,
        width: 555,
        height,
      },
      height,
      hasIllustration: Boolean(illustrationSrc),
      keepTogether: Boolean(illustrationSrc),
    };
  });

  const paginated = layoutQuestionBlocks(
    blocks,
    meta,
    page1ContentStartY(meta.classLevel),
    continuationContentStartY(meta.classLevel),
    req.pageCount,
  );

  const pages: WorksheetPage[] = paginated.map((pageBlocks, idx) => {
    const page = createEmptyPage(idx + 1, idx === 0);
    if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
    let qNum = 0;
    for (const b of pageBlocks) {
      qNum += 1;
      const prompt = req.answerKey && questions[qNum - 1]?.answer
        ? `Question ${qNum}. ${b.prompt.replace(/^Question \d+\.\s*/, "")} → ${questions[qNum - 1]!.answer}`
        : `Question ${qNum}. ${b.prompt.replace(/^Question \d+\.\s*/, "")}`;
      page.elements.push(buildQuestionElement({ ...b, questionNumber: qNum, prompt }));
    }
    return page;
  });

  meta.pageCount = pages.length;
  const draft = assembleDocument(meta, pages, req.prompt, fallback.id);
  return finalizeWorksheet(draft, req).document;
}

export function buildFallbackDocument(req: WorksheetGenerateRequest): WorksheetDocument {
  return generateWorksheetLocal(req);
}
