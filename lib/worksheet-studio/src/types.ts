/** LPS AI Worksheet Studio — shared document model and generation types. */

export type WorksheetClass =
  | "nursery"
  | "lkg"
  | "ukg"
  | "grade1"
  | "grade2";

export type WorksheetSubject =
  | "english"
  | "math"
  | "evs"
  | "hindi"
  | "gk"
  | "phonics"
  | "drawing";

export type WorksheetDifficulty = "easy" | "medium" | "hard";

export type QuestionType =
  | "colour"
  | "circle"
  | "match"
  | "trace"
  | "draw"
  | "join"
  | "tick"
  | "cross"
  | "cut_paste"
  | "fill_blank"
  | "missing_letters"
  | "beginning_sounds"
  | "odd_one_out"
  | "count"
  | "pattern"
  | "sorting"
  | "picture_recognition"
  | "reading"
  | "short_sentences"
  | "phonics"
  | "writing"
  | "math"
  | "evs"
  | "hindi";

export type WorksheetElementType = "text" | "image" | "shape" | "question_block";

export interface WorksheetElementBase {
  id: string;
  type: WorksheetElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  zIndex: number;
}

export interface WorksheetTextElement extends WorksheetElementBase {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  color: string;
  lineHeight?: number;
}

export interface WorksheetImageElement extends WorksheetElementBase {
  type: "image";
  src: string;
  outlineOnly?: boolean;
}

export interface WorksheetShapeElement extends WorksheetElementBase {
  type: "shape";
  shapeKind: "rect" | "circle" | "line" | "triangle";
  stroke: string;
  strokeWidth: number;
  fill: string;
  radius?: number;
}

export interface WorksheetQuestionBlock extends WorksheetElementBase {
  type: "question_block";
  questionNumber: number;
  questionType: QuestionType;
  prompt: string;
  options?: string[];
  answerLine?: boolean;
  illustrationEmoji?: string;
  illustrationLabel?: string;
  /** SVG/PNG data URL from illustration engine */
  illustrationSrc?: string;
}

export type WorksheetElement =
  | WorksheetTextElement
  | WorksheetImageElement
  | WorksheetShapeElement
  | WorksheetQuestionBlock;

export interface WorksheetPage {
  id: string;
  pageNumber: number;
  elements: WorksheetElement[];
  /** Page 1 only — LPS official header rendered by template engine */
  showLpsHeader?: boolean;
}

export interface WorksheetMeta {
  title: string;
  topic: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
  colorMode: "color" | "bw";
  isAnswerKey?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorksheetDocument {
  id: string;
  meta: WorksheetMeta;
  pages: WorksheetPage[];
  prompt: string;
  version: number;
}

export interface WorksheetGenerateRequest {
  prompt: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
  answerKey?: boolean;
}

export interface WorksheetGenerateResponse {
  document: WorksheetDocument;
  source: "ai" | "local";
  usedFallback?: boolean;
  qualityScore?: number;
}

export type WorksheetImproveAction =
  | "easier"
  | "harder"
  | "more_questions"
  | "fewer_questions"
  | "to_bw"
  | "to_color"
  | "answer_key"
  | "translate_hindi"
  | "translate_english"
  | "regenerate_images"
  | "increase_spacing"
  | "replace_images"
  | "more_writing"
  | "easier_words"
  | "reduce_colour"
  | "handwriting_practice"
  | "homework_mode"
  | "assessment_mode"
  | "low_ink"
  | "revision_questions"
  | "blooms_taxonomy";

export interface WorksheetDraftVersion {
  id: string;
  documentId: string;
  document: WorksheetDocument;
  savedAt: string;
  label: string;
}

export interface WorksheetDraftRecord {
  id: string;
  document: WorksheetDocument;
  savedAt: string;
}

/** A4 dimensions at 72 DPI — used by renderer and export */
export const A4_WIDTH = 595;
export const A4_HEIGHT = 842;
export const PAGE_MARGIN = 20;
export const PAGE_BORDER_RADIUS = 12;
