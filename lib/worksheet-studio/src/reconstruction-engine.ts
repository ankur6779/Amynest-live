import { analyzeReferenceLocal } from "./vision-analysis.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { layoutQuestionBlocks } from "./layout-engine.js";
import { scoreWorksheet } from "./quality-scoring-engine.js";
import { validatePrintReadiness } from "./print-validation.js";
import { finalizeWorksheet } from "./worksheet-pipeline.js";
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
import type {
  DetectedDrawing,
  DetectedQuestion,
  QuestionType,
  ReconstructionAnalysis,
  ReconstructionStyle,
  ReconstructionValidation,
  WorksheetDocument,
  WorksheetReconstructRequest,
  WorksheetReconstructResponse,
  WorksheetReferenceContext,
} from "./types.js";

const DRAWING_KEYWORDS = [
  "fish", "apple", "tree", "flower", "cat", "dog", "bird", "butterfly",
  "car", "bus", "sun", "moon", "star", "circle", "triangle", "shark", "whale",
];

const ACTIVITY_PATTERNS: Array<[RegExp, string]> = [
  [/colour|color/i, "colouring"],
  [/match/i, "matching"],
  [/trace|writing|handwriting/i, "writing practice"],
  [/circle|tick/i, "selection"],
  [/read|sentence/i, "reading"],
  [/count|math|add|subtract/i, "math"],
  [/fill.?blank|___/i, "fill in blanks"],
  [/draw/i, "drawing"],
  [/table|grid/i, "tables"],
];

function detectActivities(text: string): string[] {
  const found = ACTIVITY_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
  return found.length ? [...new Set(found)] : ["mixed activities"];
}

function extractQuestionsFromText(text: string): DetectedQuestion[] {
  const questions: DetectedQuestion[] = [];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let num = 0;
  for (const line of lines) {
    const qMatch = line.match(/^(?:q(?:uestion)?\s*)?(\d+)[.)]\s*(.+)/i);
    if (qMatch) {
      num = parseInt(qMatch[1]!, 10);
      const prompt = qMatch[2]!;
      questions.push({
        number: num,
        type: guessQuestionType(prompt),
        prompt,
        confidence: 72,
      });
    } else if (/^(?:fill|circle|match|colour|count|trace|english|hindi)/i.test(line) && line.length > 8) {
      num += 1;
      questions.push({
        number: num,
        type: guessQuestionType(line),
        prompt: line,
        confidence: 58,
        uncertainWords: hasHandwritingInLine(line) ? findUncertainWords(line) : undefined,
      });
    }
  }
  return questions;
}

function guessQuestionType(prompt: string): string {
  const l = prompt.toLowerCase();
  if (/colour|color/.test(l)) return "colour";
  if (/circle/.test(l)) return "circle";
  if (/match/.test(l)) return "match";
  if (/trace|write/.test(l)) return "writing";
  if (/count/.test(l)) return "count";
  if (/read/.test(l)) return "reading";
  if (/\+|\-|math|add/.test(l)) return "math";
  return "fill_blank";
}

function hasHandwritingInLine(line: string): boolean {
  return /[a-z]{1,2}\s|~~|\?\?|unclear/i.test(line);
}

function findUncertainWords(line: string): string[] {
  return line.split(/\s+/).filter((w) => w.length > 4 && /[aeiou]/i.test(w)).slice(0, 2);
}

function detectDrawings(text: string): DetectedDrawing[] {
  const l = text.toLowerCase();
  const drawings: DetectedDrawing[] = [];
  for (const kw of DRAWING_KEYWORDS) {
    if (l.includes(kw)) {
      drawings.push({
        label: kw,
        illustrationKind: detectIllustrationFromText(kw),
        confidence: 70,
        replacedWithSvg: true,
      });
    }
  }
  return drawings;
}

function detectImages(text: string, ref: WorksheetReferenceContext): string[] {
  const images: string[] = [];
  if ((ref.imageCount ?? 0) > 0) images.push("uploaded illustration");
  for (const kw of DRAWING_KEYWORDS) {
    if (text.toLowerCase().includes(kw)) images.push(kw);
  }
  return [...new Set(images)];
}

/** Analyze a single reconstruction source (local heuristics + vision metadata) */
export function analyzeReconstructionSource(ref: WorksheetReferenceContext): ReconstructionAnalysis {
  const base = analyzeReferenceLocal(ref);
  const text = `${ref.textSnippet ?? ""} ${ref.filename} ${ref.layoutHints?.join(" ") ?? ""}`;
  const activities = detectActivities(text);
  const questions = extractQuestionsFromText(text);
  const drawings = detectDrawings(text);
  const detectedImages = detectImages(text, ref);
  const hasHandwriting = /handwrit|notebook|rough|scan/i.test(text) || ref.kind === "image";
  const hasStudentAnswers = /answer|student|filled/i.test(text);
  const tables = (text.match(/table|grid/gi) ?? []).length;

  const uncertainAreas: string[] = [];
  if (questions.length === 0) uncertainAreas.push("Question text may need manual review");
  if (hasHandwriting) uncertainAreas.push("Handwriting detected — some words may be uncertain");
  if ((ref.pageCount ?? 1) > 1) uncertainAreas.push("Multi-page document — verify all pages");

  let confidence = base.confidence;
  if (questions.length > 0) confidence += 10;
  if (drawings.length > 0) confidence += 5;
  if (ref.thumbnailDataUrl) confidence += 5;
  confidence = Math.min(95, confidence);

  return {
    classLevel: base.classLevel,
    subject: base.subject,
    topic: base.topic,
    difficulty: base.difficulty,
    language: base.language,
    activities,
    detectedImages,
    questions,
    drawings,
    tables,
    hasHandwriting,
    hasStudentAnswers,
    pageCount: Math.min(4, ref.pageCount ?? 1),
    confidence,
    uncertainAreas,
    source: "local",
  };
}

export function analyzeReconstructionSources(sources: WorksheetReferenceContext[]): ReconstructionAnalysis[] {
  return sources.map(analyzeReconstructionSource);
}

function applyReconstructionStyle(doc: WorksheetDocument, style: ReconstructionStyle): WorksheetDocument {
  if (style === "low_ink") {
    return finalizeWorksheet({
      ...doc,
      meta: { ...doc.meta, colorMode: "bw", updatedAt: new Date().toISOString() },
      version: doc.version + 1,
    }).document;
  }
  if (style === "color") {
    return finalizeWorksheet({
      ...doc,
      meta: { ...doc.meta, colorMode: "color", updatedAt: new Date().toISOString() },
      version: doc.version + 1,
    }).document;
  }
  return doc;
}

/** Offline reconstruction — OCR-style text extraction + layout rebuild */
export function reconstructWorksheetLocal(req: WorksheetReconstructRequest): WorksheetReconstructResponse {
  const analysis = req.analysis ?? analyzeReconstructionSources(req.sources).reduce(
    (a, b) => (b.confidence > a.confidence ? b : a),
    analyzeReconstructionSource(req.sources[0]!),
  );

  const topic = req.topic ?? analysis.topic ?? "Classroom Worksheet";
  const pageCount = Math.min(4, req.pageCount ?? analysis.pageCount ?? 1);

  if (analysis.questions.length >= 2) {
    resetIdCounter();
    const meta = {
      title: topic,
      topic,
      classLevel: req.classLevel,
      subject: req.subject,
      difficulty: req.difficulty,
      pageCount,
      colorMode: req.style === "low_ink" ? "bw" as const : "color" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blocks = analysis.questions.map((q) => {
      const label = q.prompt;
      const illSrc = analysis.drawings.length
        ? getIllustration(detectIllustrationFromText(analysis.drawings[0]!.label))
        : undefined;
      const height = estimateQuestionBlockHeight(req.classLevel, 0, Boolean(illSrc));
      return {
        block: {
          questionNumber: q.number,
          questionType: (VALID_Q.has(q.type) ? q.type : "fill_blank") as QuestionType,
          prompt: q.prompt,
          illustrationSrc: illSrc,
          illustrationLabel: analysis.drawings[0]?.label,
          width: 555,
          height,
        },
        height,
        hasIllustration: Boolean(illSrc),
        keepTogether: Boolean(illSrc),
      };
    });

    const paginated = layoutQuestionBlocks(
      blocks,
      meta,
      page1ContentStartY(req.classLevel),
      continuationContentStartY(req.classLevel),
      pageCount,
    );

    const pages = paginated.map((pageBlocks, idx) => {
      const page = createEmptyPage(idx + 1, idx === 0);
      if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
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

    let doc = assembleDocument(meta, pages, `Reconstructed: ${topic}`, nextId("doc"));
    doc = applyReconstructionStyle(finalizeWorksheet(doc).document, req.style);
    const validation = validateReconstructionDocument(doc, analysis);
    return {
      document: doc,
      source: "local",
      usedFallback: true,
      qualityScore: scoreWorksheet(doc).overall,
      validation,
      uncertainAreas: analysis.uncertainAreas,
    };
  }

  const generated = generateWorksheetLocal({
    prompt: `Reconstruct worksheet on ${topic} — preserve activity types: ${analysis.activities.join(", ")}`,
    classLevel: req.classLevel,
    subject: req.subject,
    difficulty: req.difficulty,
    pageCount,
    language: req.language,
    references: req.sources,
    imageMode: "similar_style",
  });

  let doc = applyReconstructionStyle(
    finalizeWorksheet({ ...generated, prompt: `Reconstructed: ${topic}` }).document,
    req.style,
  );
  const validation = validateReconstructionDocument(doc, analysis);
  return {
    document: doc,
    source: "local",
    usedFallback: true,
    qualityScore: scoreWorksheet(doc).overall,
    validation,
    uncertainAreas: [...analysis.uncertainAreas, "AI enhancement unavailable — basic layout generated"],
  };
}

const VALID_Q = new Set([
  "colour", "circle", "match", "trace", "draw", "join", "tick", "cross",
  "fill_blank", "writing", "math", "reading", "count", "pattern",
]);

/** Quality validation for reconstructed worksheets */
export function validateReconstructionDocument(
  doc: WorksheetDocument,
  analysis?: ReconstructionAnalysis,
): ReconstructionValidation {
  const issues: string[] = [];
  const highlights: string[] = [];
  const printIssues = validatePrintReadiness(doc);
  const score = scoreWorksheet(doc);

  const questionCount = doc.pages.flatMap((p) => p.elements).filter((e) => e.type === "question_block").length;
  if (questionCount === 0) issues.push("No questions detected in reconstructed worksheet");
  else highlights.push(`${questionCount} editable question block(s)`);

  if (analysis?.questions.length && questionCount < analysis.questions.length) {
    issues.push(`Possible missing questions (${questionCount}/${analysis.questions.length})`);
  }

  if (printIssues.length > 0) {
    for (const w of printIssues.slice(0, 3)) issues.push(w.message);
  } else {
    highlights.push("Print-safe margins verified");
  }

  if (score.overall < 60) issues.push("Overall quality score below threshold");
  if (score.readability < 50) issues.push("Font sizes may be too small for class level");

  const numbering = doc.pages.flatMap((p) => p.elements)
    .filter((e) => e.type === "question_block")
    .map((e) => e.questionNumber);
  const gaps = numbering.some((n, i) => n !== i + 1);
  if (gaps) issues.push("Question numbering may have gaps");

  let confidence = analysis?.confidence ?? score.overall;
  if (issues.length > 0) confidence = Math.min(confidence, 85);
  if (issues.length > 2) confidence = Math.min(confidence, 70);

  return {
    passed: confidence >= 90 && issues.length === 0,
    confidence,
    issues,
    highlights,
  };
}

export { mergeReconstructionAnalyses } from "./reconstruction-prompt.js";
