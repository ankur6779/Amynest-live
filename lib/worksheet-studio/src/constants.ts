import type { WorksheetClass, WorksheetDifficulty, WorksheetSubject } from "./types.js";

export const CLASS_LABELS: Record<WorksheetClass, string> = {
  nursery: "Nursery",
  lkg: "LKG",
  ukg: "UKG",
  grade1: "Grade 1",
  grade2: "Grade 2",
};

export const SUBJECT_LABELS: Record<WorksheetSubject, string> = {
  english: "English",
  math: "Math",
  evs: "EVS",
  hindi: "Hindi",
  gk: "GK",
  phonics: "Phonics",
  drawing: "Drawing",
};

export const DIFFICULTY_LABELS: Record<WorksheetDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const PROMPT_PLACEHOLDERS = [
  "Create a UKG worksheet on Sea Animals.",
  "Create an LKG tracing worksheet for letter A.",
  "Generate a Grade 1 subtraction worksheet with pictures.",
  "Create a bilingual English-Hindi worksheet on Fruits.",
  "Circle the fruits and match the colours",
  "Beginning sounds with large illustrations",
  "Hindi Swar worksheet with tracing",
] as const;

export const LPS_SCHOOL_NAME = "LUCKNOW PUBLIC SCHOOL";
export const LPS_FOUNDATION = "(C.P. Singh Foundation)";

export const FONT_SIZES_BY_CLASS: Record<WorksheetClass, { title: number; body: number; prompt: number }> = {
  nursery: { title: 22, body: 18, prompt: 20 },
  lkg: { title: 20, body: 16, prompt: 18 },
  ukg: { title: 18, body: 15, prompt: 16 },
  grade1: { title: 16, body: 14, prompt: 15 },
  grade2: { title: 15, body: 13, prompt: 14 },
};

export const QUESTIONS_PER_PAGE: Record<WorksheetDifficulty, number> = {
  easy: 4,
  medium: 5,
  hard: 6,
};

export const AUTO_SAVE_INTERVAL_MS = 3000;
export const DRAFT_DB_NAME = "amynest-worksheet-studio";
export const DRAFT_STORE_NAME = "drafts";
export const VERSION_STORE_NAME = "versions";
/** Print export resolution — 300 DPI relative to 72 DPI canvas */
export const EXPORT_DPI = 300;
export const SCREEN_DPI = 72;
export const EXPORT_SCALE_MULTIPLIER = EXPORT_DPI / SCREEN_DPI;
