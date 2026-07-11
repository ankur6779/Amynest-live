import type {
  QuestionType,
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
  page1ContentStartY,
  resetIdCounter,
} from "./renderer/page-layout.js";
import { measureQuestionBlockHeight, CONTENT_WIDTH } from "./flow-layout-engine.js";
import { layoutQuestionBlocks } from "./layout-engine.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { finalizeWorksheet } from "./worksheet-pipeline.js";
import { generateWorksheetLocal } from "./local-generator.js";
import {
  assertParsedDocumentOrThrow,
  getLivePipelineSession,
} from "./live-pipeline-audit.js";
import {
  type AiWorksheetResponse,
  validateAiWorksheetResponse,
} from "./ai-response-contract.js";

/**
 * Build WorksheetDocument from a VALIDATED AI contract only.
 * Throws on any invalid input — never best-effort / never returns null.
 */
export function buildDocumentFromAiContract(
  contract: AiWorksheetResponse,
  req: WorksheetGenerateRequest,
  documentId: string,
): WorksheetDocument {
  resetIdCounter();

  const meta: WorksheetMeta = {
    title: contract.title,
    topic: contract.topic,
    classLevel: req.classLevel,
    subject: req.subject,
    difficulty: req.difficulty,
    pageCount: contract.pages.length,
    colorMode: "color",
    isAnswerKey: req.answerKey ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const byPage = new Map<number, typeof contract.questions>();
  for (const page of contract.pages) {
    const qs = page.questionIds.map((id) => {
      const q = contract.questions.find((item) => item.id === id);
      if (!q) throw new Error(`[AiContract] missing question ${id}`);
      return q;
    });
    byPage.set(page.pageNumber, qs);
  }

  const orderedQuestions = contract.pages.flatMap((p) => byPage.get(p.pageNumber) ?? []);

  const blocks = orderedQuestions.map((q, i) => {
    const prompt = q.prompt;
    const label = q.illustrationLabel ?? prompt;
    const detected = detectIllustrationFromText(label);
    const illustrationSrc = q.illustrationEmoji || q.illustrationLabel
      ? getIllustration(detected)
      : undefined;
    const options = q.options ?? undefined;
    const height = measureQuestionBlockHeight(
      {
        prompt,
        options,
        answerLine: q.answerLine,
        illustrationSrc,
        illustrationEmoji: q.illustrationEmoji ?? undefined,
      },
      meta.classLevel,
      CONTENT_WIDTH,
    );
    return {
      block: {
        questionNumber: i + 1,
        questionType: q.questionType as QuestionType,
        prompt,
        options,
        answerLine: q.answerLine,
        illustrationEmoji: q.illustrationEmoji ?? undefined,
        illustrationLabel: q.illustrationLabel ?? undefined,
        illustrationSrc,
        width: CONTENT_WIDTH,
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
    Math.max(req.pageCount, contract.pages.length),
  );

  const pages: WorksheetPage[] = paginated.map((pageBlocks, idx) => {
    const page = createEmptyPage(idx + 1, idx === 0);
    if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
    let qNum = 0;
    for (const b of pageBlocks) {
      qNum += 1;
      const source = orderedQuestions[qNum - 1];
      const prompt = req.answerKey && source?.answer
        ? `Question ${qNum}. ${b.prompt.replace(/^Question \d+\.\s*/, "")} → ${source.answer}`
        : `Question ${qNum}. ${b.prompt.replace(/^Question \d+\.\s*/, "")}`;
      page.elements.push(buildQuestionElement({ ...b, questionNumber: qNum, prompt }));
    }
    return page;
  });

  meta.pageCount = pages.length;
  return assembleDocument(meta, pages, contract.prompt || req.prompt, documentId);
}

/**
 * @deprecated Use buildDocumentFromAiContract after validateAiWorksheetResponse.
 * Kept only for tests that pass pre-validated fixtures via parseAiWorksheetResponse.
 */
export function buildDocumentFromAiJson(
  raw: unknown,
  req: WorksheetGenerateRequest,
  documentId: string,
): WorksheetDocument | null {
  const validated = validateAiWorksheetResponse(raw);
  if (!validated.ok) return null;
  return buildDocumentFromAiContract(validated.data, req, documentId);
}

/**
 * Strict parse: VALID contract → WorksheetDocument, or THROW.
 * Never returns a broken document. Callers must catch and use local fallback.
 */
export function parseAiWorksheetContractOrThrow(
  raw: unknown,
  req: WorksheetGenerateRequest,
  documentId: string,
): WorksheetDocument {
  const session = getLivePipelineSession();
  const validated = validateAiWorksheetResponse(raw);
  if (!validated.ok) {
    session?.log(`STEP2 CONTRACT INVALID — FAIL: ${validated.errors.join("; ")}`);
    if (session && !session.firstCorruptionStage) {
      session.firstCorruptionStage = "raw_api→parsed_document";
      session.mutationDetected = true;
    }
    throw new Error(`AI worksheet contract invalid: ${validated.errors.join("; ")}`);
  }

  const draft = buildDocumentFromAiContract(validated.data, req, documentId);
  session?.captureStage("parsed_document", draft, "validated contract → document");
  assertParsedDocumentOrThrow(draft, req);

  const finalized = finalizeWorksheet(draft, req).document;
  session?.captureStage("after_finalize", finalized, "finalizeWorksheet");
  assertParsedDocumentOrThrow(finalized, req);

  return finalized;
}

/**
 * Legacy wrapper: VALID → document; INVALID → throw (no silent fallback).
 * Prefer parseAiWorksheetContractOrThrow. The `fallback` arg is unused and kept
 * only for call-site compatibility during migration — do not rely on it.
 */
export function parseAiWorksheetResponse(
  raw: unknown,
  req: WorksheetGenerateRequest,
  fallback: WorksheetDocument,
): WorksheetDocument {
  return parseAiWorksheetContractOrThrow(raw, req, fallback.id);
}

export function buildFallbackDocument(req: WorksheetGenerateRequest): WorksheetDocument {
  return generateWorksheetLocal(req);
}
