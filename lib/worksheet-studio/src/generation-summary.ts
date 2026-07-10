import { CLASS_LABELS, SUBJECT_LABELS } from "./constants.js";
import { countReferenceImages } from "./reference-limits.js";
import { effectiveGenerationPrompt } from "./prompt-enhancer.js";
import type {
  EnhancePromptRequest,
  GenerationSummary,
  PromptQualityLabel,
  ReferenceImageMode,
  WorksheetLanguage,
  WorksheetReferenceContext,
} from "./types.js";

function scorePromptQuality(prompt: string, hasEnhanced: boolean, refCount: number): PromptQualityLabel {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (hasEnhanced || (words >= 25 && refCount > 0)) return "Excellent";
  if (words >= 12 || refCount > 0 || prompt.includes("\n")) return "Good";
  return "Basic";
}

function estimateQuality(
  promptQuality: PromptQualityLabel,
  refCount: number,
  imageCount: number,
  pageCount: number,
): number {
  let score = promptQuality === "Excellent" ? 92 : promptQuality === "Good" ? 84 : 76;
  if (refCount > 0) score += Math.min(4, refCount);
  if (imageCount > 0) score += Math.min(3, Math.floor(imageCount / 2));
  if (pageCount >= 2) score += 1;
  return Math.min(98, score);
}

const LANGUAGE_LABELS: Record<WorksheetLanguage, string> = {
  english: "English",
  hindi: "Hindi",
  bilingual: "Bilingual",
};

export function buildGenerationSummary(input: {
  classLevel: EnhancePromptRequest["classLevel"];
  subject: EnhancePromptRequest["subject"];
  difficulty: EnhancePromptRequest["difficulty"];
  pageCount: number;
  prompt: string;
  enhancedPrompt?: string;
  references?: WorksheetReferenceContext[];
  imageMode?: ReferenceImageMode;
  language?: WorksheetLanguage;
}): GenerationSummary {
  const refs = input.references ?? [];
  const effective = effectiveGenerationPrompt({
    ...input,
    references: refs,
  });
  const hasEnhanced = Boolean(input.enhancedPrompt?.trim());
  const promptQuality = scorePromptQuality(effective, hasEnhanced, refs.length);
  const imagesFound = countReferenceImages(refs);

  return {
    classLabel: CLASS_LABELS[input.classLevel],
    subjectLabel: SUBJECT_LABELS[input.subject],
    pages: input.pageCount,
    referenceFiles: refs.length,
    imagesFound,
    promptQuality,
    qualityEstimate: estimateQuality(promptQuality, refs.length, imagesFound, input.pageCount),
    imageMode: input.imageMode ?? "similar_style",
    languageLabel: LANGUAGE_LABELS[input.language ?? "english"],
    effectivePrompt: effective,
  };
}
