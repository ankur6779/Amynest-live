import { A4_HEIGHT, PAGE_MARGIN, type WorksheetDocument } from "./types.js";
import { validateEducationalQuality, type ValidationIssue } from "./educational-quality-engine.js";
import { measureActivityDiversity } from "./question-diversity-engine.js";
import { getLpsStandard } from "./lps-standards.js";
import { validatePrintReadiness } from "./print-validation.js";

export interface QualityScore {
  overall: number;
  educational: number;
  print: number;
  diversity: number;
  spacing: number;
  ageSuitability: number;
  readability: number;
}

export function scoreWorksheet(doc: WorksheetDocument): QualityScore {
  const eduIssues = validateEducationalQuality(doc);
  const printIssues = validatePrintReadiness(doc);
  const questions = doc.pages.flatMap((p) =>
    p.elements.filter((e) => e.type === "question_block"),
  );

  const diversity = measureActivityDiversity(
    questions.map((q) => ({
      type: q.questionType,
      prompt: q.prompt,
      options: q.options,
    })),
  );

  const errorCount = [...eduIssues, ...printIssues].filter((i) => i.severity === "error").length;
  const warnCount = [...eduIssues, ...printIssues].filter((i) => i.severity === "warn").length;

  const educational = Math.max(0, 100 - errorCount * 18 - warnCount * 6);
  const print = Math.max(0, 100 - printIssues.filter((i) => i.severity === "error").length * 20
    - printIssues.filter((i) => i.severity === "warn").length * 5);

  const standard = getLpsStandard(doc.meta.classLevel);
  let spacing = 85;
  for (const page of doc.pages) {
    const qs = page.elements.filter((e) => e.type === "question_block");
    if (qs.length < standard.minQuestionsPerPage && doc.pages.length > 1) spacing -= 15;
    for (const q of qs) {
      if (q.y + q.height > A4_HEIGHT - PAGE_MARGIN - 36) spacing -= 10;
    }
  }
  spacing = Math.max(0, spacing);

  const ageSuitability = Math.max(0, 100 - eduIssues.filter((i) =>
    ["READING_LEVEL", "COGNITIVE_LOAD", "FONT_SIZE"].includes(i.code),
  ).length * 12);

  const readability = Math.max(0, 100 - eduIssues.filter((i) =>
    i.code === "READING_LEVEL",
  ).length * 15);

  const overall = Math.round(
    educational * 0.3 + print * 0.25 + diversity * 0.2 + spacing * 0.1 + ageSuitability * 0.1 + readability * 0.05,
  );

  return {
    overall,
    educational,
    print,
    diversity,
    spacing,
    ageSuitability,
    readability,
  };
}

export const QUALITY_THRESHOLD = 90;

export function needsQualityImprovement(doc: WorksheetDocument, threshold = QUALITY_THRESHOLD): boolean {
  return scoreWorksheet(doc).overall < threshold;
}

export function collectQualityIssues(doc: WorksheetDocument): ValidationIssue[] {
  return [...validateEducationalQuality(doc), ...validatePrintReadiness(doc)];
}
