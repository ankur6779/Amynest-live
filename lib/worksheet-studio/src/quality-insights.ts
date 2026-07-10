import type { WorksheetDocument } from "./types.js";
import type { WorksheetQualityBreakdown } from "./types.js";
import {
  scoreWorksheet,
  QUALITY_THRESHOLD,
  collectQualityIssues,
} from "./quality-scoring-engine.js";

export function getQualityBreakdown(doc: WorksheetDocument): WorksheetQualityBreakdown {
  const base = scoreWorksheet(doc);
  const questions = doc.pages.flatMap((p) =>
    p.elements.filter((e) => e.type === "question_block"),
  );

  const writingCount = questions.filter((q) =>
    q.answerLine || q.questionType === "trace" || q.questionType === "writing" || /write|trace/i.test(q.prompt),
  ).length;

  const visual = Math.min(100, 70 + doc.pages.flatMap((p) =>
    p.elements.filter((e) => e.type === "image" || (e.type === "question_block" && e.illustrationSrc)),
  ).length * 5);

  const writingPractice = questions.length
    ? Math.round((writingCount / questions.length) * 100)
    : 40;

  const types = new Set(questions.map((q) => q.questionType));
  const bloomCoverage = Math.min(100, types.size * 18 + (questions.some((q) => /apply|solve/i.test(q.prompt)) ? 15 : 0));

  const difficultyBalance = doc.meta.difficulty === "medium" ? 88
    : doc.meta.difficulty === "easy" ? 82 : 78;

  const improvements = getImprovementSuggestions(doc, base.overall);

  return {
    ...base,
    visual,
    writingPractice,
    bloomCoverage,
    difficultyBalance,
    improvements,
  };
}

export function getImprovementSuggestions(doc: WorksheetDocument, overall?: number): string[] {
  const score = overall ?? scoreWorksheet(doc).overall;
  const issues = collectQualityIssues(doc);
  const suggestions: string[] = [];

  if (score < QUALITY_THRESHOLD) {
    suggestions.push("Use ✨ Enhance Prompt before generating for richer activities.");
  }
  for (const issue of issues.slice(0, 4)) {
    if (issue.code === "LOW_DIVERSITY") suggestions.push("Add more varied question types (matching, tracing, reading).");
    if (issue.code === "OVERFLOW") suggestions.push("Increase spacing or reduce questions per page.");
    if (issue.code === "READING_LEVEL") suggestions.push("Simplify vocabulary for younger learners.");
    if (issue.code === "SPARSE_PAGE") suggestions.push("Add one more activity to fill the page.");
  }
  if (!suggestions.length && score < 95) {
    suggestions.push("Try conversational edits: “Add handwriting space” or “Make images larger”.");
  }
  return [...new Set(suggestions)].slice(0, 5);
}
