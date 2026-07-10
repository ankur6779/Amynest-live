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
  /** v6.1 — AI-enhanced prompt (used for generation when set) */
  enhancedPrompt?: string;
  /** v6.1 — how uploaded reference images inform generation */
  imageMode?: ReferenceImageMode;
  /** v6.1 — analyzed reference files (summaries + thumbnails, not raw copyrighted content) */
  references?: WorksheetReferenceContext[];
  language?: WorksheetLanguage;
}

export type WorksheetLanguage = "english" | "hindi" | "bilingual";

export type ReferenceImageMode =
  | "same_style"
  | "similar_style"
  | "ignore_images"
  | "images_only";

export type ReferenceFileKind = "pdf" | "docx" | "image" | "svg";

export interface WorksheetReferenceContext {
  id: string;
  filename: string;
  kind: ReferenceFileKind;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  imageCount?: number;
  textSnippet?: string;
  layoutHints?: string[];
  thumbnailDataUrl?: string;
  pageThumbnails?: string[];
}

export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
  favorite: boolean;
  createdAt: string;
  referenceCount: number;
}

export type PromptQualityLabel = "Basic" | "Good" | "Excellent";

export interface GenerationSummary {
  classLabel: string;
  subjectLabel: string;
  pages: number;
  referenceFiles: number;
  imagesFound: number;
  promptQuality: PromptQualityLabel;
  qualityEstimate: number;
  imageMode: ReferenceImageMode;
  languageLabel: string;
  effectivePrompt: string;
}

export interface EnhancePromptRequest {
  prompt: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
  language?: WorksheetLanguage;
  references?: WorksheetReferenceContext[];
}

export interface EnhancePromptResponse {
  enhancedPrompt: string;
  source: "ai" | "local";
}

/** v6.2 — AI vision / reference analysis */
export interface ReferenceAnalysis {
  referenceId: string;
  classLevel?: WorksheetClass;
  subject?: WorksheetSubject;
  topic?: string;
  difficulty?: WorksheetDifficulty;
  worksheetStyle: string;
  questionTypes: string[];
  hasWritingPractice: boolean;
  illustrationDensity: "low" | "medium" | "high";
  estimatedAge: string;
  pageCount?: number;
  language?: WorksheetLanguage;
  curriculum?: string;
  brandingDetected?: string;
  layoutFeatures: string[];
  confidence: number;
  source: "local" | "ai";
}

export interface LivePromptQuality {
  stars: 1 | 2 | 3 | 4 | 5;
  label: PromptQualityLabel;
  scorePercent: number;
  included: string[];
  suggestions: string[];
}

export interface WorksheetQualityBreakdown {
  overall: number;
  educational: number;
  print: number;
  visual: number;
  diversity: number;
  spacing: number;
  ageSuitability: number;
  readability: number;
  writingPractice: number;
  bloomCoverage: number;
  difficultyBalance: number;
  improvements: string[];
}

export interface DocumentChangeSummary {
  summary: string;
  changedElements: number;
  highlights: string[];
}

export interface PostGenerationRecommendation {
  id: string;
  label: string;
  description: string;
  action: WorksheetImproveAction | "regenerate_variant";
  variant?: "homework" | "assessment" | "revision" | "coloring" | "writing" | "flashcards";
}

export interface AiAnalyticsDashboard {
  promptEnhancements: number;
  referenceUploads: number;
  visionAnalyses: number;
  avgPromptLength: number;
  copilotEdits: number;
  avgWorksheetScore: number;
  topSubjects: Array<{ subject: string; count: number }>;
  topClasses: Array<{ classLevel: string; count: number }>;
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
export const PAGE_MARGIN = 28;
export const PAGE_BORDER_RADIUS = 12;
