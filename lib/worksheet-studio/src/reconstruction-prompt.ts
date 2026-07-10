import { CLASS_LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS } from "./constants.js";
import type { ReconstructionAnalysis, ReconstructionStyle, WorksheetReconstructRequest } from "./types.js";

export const RECONSTRUCTION_STYLE_LABELS: Record<ReconstructionStyle, string> = {
  exact: "Recreate Exactly",
  improve_layout: "Improve Layout",
  modern: "Modern Design",
  lps: "LPS Style",
  low_ink: "Low Ink Version",
  color: "Color Version",
  assessment: "Assessment Version",
  homework: "Homework Version",
};

const STYLE_HINTS: Record<ReconstructionStyle, string> = {
  exact: "Preserve question order, activity types, and educational intent closely — improve typography only.",
  improve_layout: "Keep all questions but rebalance spacing, margins, and visual hierarchy for print.",
  modern: "Clean contemporary layout with clear sections and generous white space.",
  lps: "Official LPS header, double-line borders, continuation bar on page 2+, preschool-friendly fonts.",
  low_ink: "Black outlines only, minimal fills, printer-friendly.",
  color: "Colouring activities and friendly accents where age-appropriate.",
  assessment: "No answer hints, clear numbering, space for student name and date.",
  homework: "Parent-friendly instructions, moderate difficulty, writing practice lines.",
};

export function buildReconstructionSystemPrompt(): string {
  return `You are the LPS AI Worksheet Reconstruction Engine for Indian pre-primary and primary teachers.
Teachers upload photos, scans, PDFs, or handwritten notebook pages. You understand educational meaning — NOT just OCR.

Output ONLY valid JSON:
{
  "title": string,
  "topic": string,
  "pages": [
    {
      "elements": [
        { "kind": "text", "content": string, "x": number, "y": number, "width": number, "fontSize": number, "fontWeight": "normal"|"bold", "textAlign": "left"|"center" },
        { "kind": "question", "number": number, "type": "colour"|"circle"|"match"|"trace"|"draw"|"join"|"tick"|"cross"|"fill_blank"|"writing"|"math"|"reading"|"count"|"pattern", "prompt": string, "options": string[], "answerLine": boolean, "illustrationLabel": string },
        { "kind": "writing_lines", "x": number, "y": number, "width": number, "count": number },
        { "kind": "shape", "shapeKind": "rect"|"line", "x": number, "y": number, "width": number, "height": number, "stroke": "#111" }
      ]
    }
  ],
  "detectedDrawings": [{ "label": string, "illustrationKind": string }],
  "uncertainAreas": string[]
}

Rules:
- A4 canvas: 595×842 pt. Margins ≥28pt. Never clip content.
- Recreate layout intent — do NOT copy pixels or copyrighted text verbatim. Generate ORIGINAL wording inspired by structure.
- Replace rough hand-drawn sketches with clean printable black-outline illustrations via illustrationLabel (fish, apple, tree, etc.).
- Ignore detected student answers; keep teacher questions only.
- Number questions sequentially. Include instructions as text elements.
- Tables → use question blocks or rect shapes with aligned text.
- Handwriting → convert to editable typed text; flag uncertain words in uncertainAreas.
- Match class age: Nursery/LKG fewer words; Grade 1/2 more reading/writing.
- No markdown. No extra keys.`;
}

export function buildReconstructionUserPayload(req: WorksheetReconstructRequest): string {
  const analysis = req.analysis;
  return JSON.stringify({
    style: RECONSTRUCTION_STYLE_LABELS[req.style],
    styleHint: STYLE_HINTS[req.style],
    class: CLASS_LABELS[req.classLevel],
    subject: SUBJECT_LABELS[req.subject],
    difficulty: DIFFICULTY_LABELS[req.difficulty],
    topic: req.topic ?? analysis?.topic,
    language: req.language ?? analysis?.language ?? "english",
    pageCount: req.pageCount ?? analysis?.pageCount ?? 1,
    analysis: analysis
      ? {
          activities: analysis.activities,
          questions: analysis.questions.map((q) => ({ number: q.number, type: q.type, prompt: q.prompt })),
          drawings: analysis.drawings.map((d) => d.label),
          tables: analysis.tables,
          hasHandwriting: analysis.hasHandwriting,
          confidence: analysis.confidence,
        }
      : undefined,
    sources: req.sources.map((s) => ({
      filename: s.filename,
      kind: s.kind,
      pages: s.pageCount,
      layoutHints: s.layoutHints,
      textSnippet: s.textSnippet?.slice(0, 400),
    })),
    visionImageCount: req.visionImages?.length ?? 0,
    copyright: "Reference is inspiration only — create original worksheet preserving educational intent.",
  });
}

export function buildReconstructionAnalysisSystemPrompt(): string {
  return `You analyze uploaded worksheet images/scans for LPS teachers.
Output ONLY valid JSON:
{
  "analyses": [{
    "referenceId": string,
    "classLevel": "nursery"|"lkg"|"ukg"|"grade1"|"grade2",
    "subject": "english"|"math"|"evs"|"hindi"|"gk"|"phonics"|"drawing",
    "topic": string,
    "difficulty": "easy"|"medium"|"hard",
    "language": "english"|"hindi"|"bilingual",
    "activities": string[],
    "detectedImages": string[],
    "questions": [{ "number": number, "type": string, "prompt": string, "confidence": number, "uncertainWords": string[] }],
    "drawings": [{ "label": string, "illustrationKind": string, "confidence": number }],
    "tables": number,
    "hasHandwriting": boolean,
    "hasStudentAnswers": boolean,
    "pageCount": number,
    "confidence": number,
    "uncertainAreas": string[]
  }]
}
Understand educational structure — not just OCR. Detect activity types, illustrations, tables, handwriting.`;
}

export function buildReconstructionAnalysisUserPayload(
  sources: WorksheetReconstructRequest["sources"],
  visionImages?: string[],
): string {
  return JSON.stringify({
    files: sources.map((s) => ({
      id: s.id,
      filename: s.filename,
      kind: s.kind,
      pages: s.pageCount,
      layoutHints: s.layoutHints,
      textSnippet: s.textSnippet?.slice(0, 400),
    })),
    visionImageCount: visionImages?.length ?? 0,
  });
}

export function mergeReconstructionAnalyses(analyses: ReconstructionAnalysis[]): ReconstructionAnalysis {
  if (analyses.length === 0) {
    return {
      activities: [],
      detectedImages: [],
      questions: [],
      drawings: [],
      tables: 0,
      hasHandwriting: false,
      hasStudentAnswers: false,
      pageCount: 1,
      confidence: 40,
      uncertainAreas: ["Could not analyze upload"],
      source: "local",
    };
  }
  const best = analyses.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const activities = [...new Set(analyses.flatMap((a) => a.activities))];
  const detectedImages = [...new Set(analyses.flatMap((a) => a.detectedImages))];
  const questions = analyses.flatMap((a) => a.questions).sort((a, b) => a.number - b.number);
  const drawings = analyses.flatMap((a) => a.drawings);
  const uncertainAreas = [...new Set(analyses.flatMap((a) => a.uncertainAreas))];
  const pageCount = Math.max(...analyses.map((a) => a.pageCount), 1);
  const avgConf = Math.round(analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length);
  return {
    ...best,
    activities,
    detectedImages,
    questions,
    drawings,
    tables: analyses.reduce((s, a) => s + a.tables, 0),
    hasHandwriting: analyses.some((a) => a.hasHandwriting),
    hasStudentAnswers: analyses.some((a) => a.hasStudentAnswers),
    pageCount: Math.min(4, pageCount),
    confidence: avgConf,
    uncertainAreas,
    source: analyses.some((a) => a.source === "ai") ? "ai" : "local",
  };
}
