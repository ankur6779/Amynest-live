import { A4_HEIGHT, PAGE_MARGIN, type WorksheetDocument, type WorksheetQuestionBlock } from "./types.js";
import { FONT_SIZES_BY_CLASS } from "./constants.js";
import { getLpsStandard } from "./lps-standards.js";
import { countWords } from "./question-diversity-engine.js";

export type ValidationSeverity = "error" | "warn";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  pageNumber?: number;
}

function getQuestions(doc: WorksheetDocument): Array<WorksheetQuestionBlock & { pageNumber: number }> {
  return doc.pages.flatMap((p) =>
    p.elements
      .filter((e): e is WorksheetQuestionBlock => e.type === "question_block")
      .map((e) => ({ ...e, pageNumber: p.pageNumber })),
  );
}

export function validateEducationalQuality(doc: WorksheetDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = getLpsStandard(doc.meta.classLevel);
  const fonts = FONT_SIZES_BY_CLASS[doc.meta.classLevel];
  const questions = getQuestions(doc);

  if (questions.length === 0) {
    issues.push({ code: "NO_QUESTIONS", severity: "error", message: "Worksheet has no questions." });
    return issues;
  }

  const types = questions.map((q) => q.questionType);
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size < Math.min(3, questions.length)) {
    issues.push({
      code: "LOW_DIVERSITY",
      severity: "warn",
      message: "Activity types are too repetitive for classroom use.",
    });
  }

  const prompts = questions.map((q) => q.prompt.toLowerCase().trim());
  const dupes = prompts.length - new Set(prompts).size;
  if (dupes > 0) {
    issues.push({
      code: "DUPLICATE_QUESTIONS",
      severity: "error",
      message: `${dupes} duplicate question(s) detected.`,
    });
  }

  for (const q of questions) {
    const words = countWords(q.prompt.replace(/Question \d+\.\s*/i, ""));
    if (words > standard.maxWordsInPrompt) {
      issues.push({
        code: "READING_LEVEL",
        severity: "warn",
        message: `Question ${q.questionNumber} vocabulary may be too advanced (${words} words).`,
        pageNumber: q.pageNumber,
      });
    }
    if (q.y + q.height > A4_HEIGHT - PAGE_MARGIN - 40) {
      issues.push({
        code: "OVERFLOW",
        severity: "error",
        message: `Question ${q.questionNumber} may clip on print.`,
        pageNumber: q.pageNumber,
      });
    }
    if (q.answerLine && q.height < standard.writingAreaMinHeight) {
      issues.push({
        code: "WRITING_AREA",
        severity: "warn",
        message: `Question ${q.questionNumber} needs more writing space.`,
        pageNumber: q.pageNumber,
      });
    }
  }

  const numbers = questions.map((q) => q.questionNumber);
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i]! <= numbers[i - 1]!) {
      issues.push({ code: "NUMBER_SEQUENCE", severity: "error", message: "Question numbering is out of order." });
      break;
    }
  }

  for (const page of doc.pages) {
    const qCount = page.elements.filter((e) => e.type === "question_block").length;
    if (qCount === 0 && doc.pages.length > 1) {
      issues.push({
        code: "EMPTY_PAGE",
        severity: "error",
        message: `Page ${page.pageNumber} is empty.`,
        pageNumber: page.pageNumber,
      });
    }
    if (qCount > standard.questionsPerPage[doc.meta.difficulty] + 1) {
      issues.push({
        code: "CROWDED_PAGE",
        severity: "warn",
        message: `Page ${page.pageNumber} is overcrowded.`,
        pageNumber: page.pageNumber,
      });
    }
    const illCount = page.elements.filter(
      (e) => e.type === "question_block" && (e.illustrationSrc || e.illustrationEmoji),
    ).length;
    if (illCount > standard.maxIllustrationsPerPage) {
      issues.push({
        code: "COGNITIVE_LOAD",
        severity: "warn",
        message: `Page ${page.pageNumber} has too many illustrations.`,
        pageNumber: page.pageNumber,
      });
    }
  }

  if (fonts.prompt < standard.minPromptFontSize) {
    issues.push({
      code: "FONT_SIZE",
      severity: "warn",
      message: "Font size may be small for this class level.",
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
