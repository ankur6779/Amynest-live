import type { QuestionType, WorksheetClass, WorksheetDifficulty } from "./types.js";

export interface LpsClassStandard {
  classLevel: WorksheetClass;
  label: string;
  questionsPerPage: Record<WorksheetDifficulty, number>;
  minPromptFontSize: number;
  illustrationDensity: "low" | "medium" | "high";
  maxIllustrationsPerPage: number;
  preferredActivities: QuestionType[];
  writingAreaMinHeight: number;
  sectionGap: number;
  maxWordsInPrompt: number;
  minQuestionsPerPage: number;
  targetPageFillRatio: number;
}

const BASE_ACTIVITIES: QuestionType[] = [
  "colour", "circle", "match", "trace", "count", "draw", "reading", "writing",
  "beginning_sounds", "sorting", "pattern", "fill_blank",
];

export const LPS_CLASS_STANDARDS: Record<WorksheetClass, LpsClassStandard> = {
  nursery: {
    classLevel: "nursery",
    label: "Nursery",
    questionsPerPage: { easy: 3, medium: 4, hard: 4 },
    minPromptFontSize: 18,
    illustrationDensity: "high",
    maxIllustrationsPerPage: 4,
    preferredActivities: ["colour", "circle", "match", "trace", "count", "picture_recognition"],
    writingAreaMinHeight: 28,
    sectionGap: 28,
    maxWordsInPrompt: 8,
    minQuestionsPerPage: 2,
    targetPageFillRatio: 0.72,
  },
  lkg: {
    classLevel: "lkg",
    label: "LKG",
    questionsPerPage: { easy: 4, medium: 4, hard: 5 },
    minPromptFontSize: 16,
    illustrationDensity: "high",
    maxIllustrationsPerPage: 3,
    preferredActivities: ["colour", "trace", "circle", "match", "count", "beginning_sounds", "pattern"],
    writingAreaMinHeight: 32,
    sectionGap: 26,
    maxWordsInPrompt: 10,
    minQuestionsPerPage: 2,
    targetPageFillRatio: 0.75,
  },
  ukg: {
    classLevel: "ukg",
    label: "UKG",
    questionsPerPage: { easy: 4, medium: 5, hard: 5 },
    minPromptFontSize: 15,
    illustrationDensity: "medium",
    maxIllustrationsPerPage: 3,
    preferredActivities: ["trace", "writing", "match", "count", "reading", "beginning_sounds", "math", "pattern"],
    writingAreaMinHeight: 36,
    sectionGap: 24,
    maxWordsInPrompt: 12,
    minQuestionsPerPage: 3,
    targetPageFillRatio: 0.78,
  },
  grade1: {
    classLevel: "grade1",
    label: "Grade 1",
    questionsPerPage: { easy: 5, medium: 5, hard: 6 },
    minPromptFontSize: 14,
    illustrationDensity: "medium",
    maxIllustrationsPerPage: 2,
    preferredActivities: ["writing", "reading", "math", "fill_blank", "match", "pattern", "short_sentences"],
    writingAreaMinHeight: 40,
    sectionGap: 22,
    maxWordsInPrompt: 14,
    minQuestionsPerPage: 3,
    targetPageFillRatio: 0.8,
  },
  grade2: {
    classLevel: "grade2",
    label: "Grade 2",
    questionsPerPage: { easy: 5, medium: 6, hard: 6 },
    minPromptFontSize: 13,
    illustrationDensity: "low",
    maxIllustrationsPerPage: 2,
    preferredActivities: ["writing", "reading", "math", "fill_blank", "short_sentences", "pattern", "evs"],
    writingAreaMinHeight: 44,
    sectionGap: 20,
    maxWordsInPrompt: 16,
    minQuestionsPerPage: 4,
    targetPageFillRatio: 0.82,
  },
};

export function getLpsStandard(classLevel: WorksheetClass): LpsClassStandard {
  return LPS_CLASS_STANDARDS[classLevel];
}

export function activityTypesForClass(classLevel: WorksheetClass): QuestionType[] {
  return LPS_CLASS_STANDARDS[classLevel].preferredActivities.length > 0
    ? LPS_CLASS_STANDARDS[classLevel].preferredActivities
    : BASE_ACTIVITIES;
}
