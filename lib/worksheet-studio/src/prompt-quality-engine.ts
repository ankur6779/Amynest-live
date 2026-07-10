import { CLASS_LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS } from "./constants.js";
import type {
  LivePromptQuality,
  ReferenceAnalysis,
  WorksheetClass,
  WorksheetDifficulty,
  WorksheetLanguage,
  WorksheetSubject,
} from "./types.js";

export interface PromptQualityInput {
  prompt: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
  language?: WorksheetLanguage;
  enhancedPrompt?: string;
  referenceCount?: number;
  analysis?: Partial<ReferenceAnalysis>;
}

const CHECKS: Array<{ key: string; test: (i: PromptQualityInput) => boolean; suggest?: string }> = [
  { key: "Topic", test: (i) => i.prompt.trim().length >= 8 || Boolean(i.analysis?.topic) },
  { key: "Class", test: (i) => Boolean(i.classLevel) },
  { key: "Difficulty", test: (i) => Boolean(i.difficulty) },
  { key: "Worksheet Type", test: (i) => /worksheet|practice|activity|tracing|matching|colour/i.test(i.prompt) || Boolean(i.enhancedPrompt) },
  { key: "Question Variety", test: (i) => /match|colour|trace|circle|count|read|write|sound/i.test(i.prompt + (i.enhancedPrompt ?? "")) },
  { key: "Images", test: (i) => (i.referenceCount ?? 0) > 0 || /picture|image|illustrat/i.test(i.prompt) },
  { key: "Print Friendly", test: (i) => /print|a4|outline|black/i.test(i.prompt + (i.enhancedPrompt ?? "")) || i.pageCount >= 1 },
];

const SUGGESTIONS: Array<{ test: (i: PromptQualityInput) => boolean; text: string }> = [
  { test: (i) => !/\b[1-4]\s*page|\bpage/i.test(i.prompt) && i.pageCount === 1, text: "+ Mention page count" },
  { test: (i) => !/writing|handwriting|trace/i.test(i.prompt), text: "+ Mention handwriting space" },
  { test: (i) => !/answer key/i.test(i.prompt), text: "+ Mention answer key" },
  { test: (i) => i.language === "english" && !/hindi|bilingual/i.test(i.prompt), text: "+ Mention bilingual support" },
  { test: (i) => i.prompt.trim().split(/\s+/).length < 6, text: "+ Add more activity detail" },
  { test: (i) => (i.referenceCount ?? 0) === 0, text: "+ Upload a reference worksheet" },
];

function starsFromScore(score: number): LivePromptQuality["stars"] {
  if (score >= 92) return 5;
  if (score >= 82) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  return 1;
}

export function scoreLivePrompt(input: PromptQualityInput): LivePromptQuality {
  const included = CHECKS.filter((c) => c.test(input)).map((c) => c.key);
  const suggestions = SUGGESTIONS.filter((s) => s.test(input)).map((s) => s.text).slice(0, 4);

  let score = 55 + included.length * 6;
  if (input.enhancedPrompt?.trim()) score += 12;
  if ((input.referenceCount ?? 0) > 0) score += 8;
  if (input.analysis?.confidence) score += Math.min(8, Math.floor(input.analysis.confidence / 15));
  if (input.prompt.trim().split(/\s+/).length >= 12) score += 5;
  score = Math.min(98, score);

  const label = score >= 88 ? "Excellent" : score >= 72 ? "Good" : "Basic";

  return {
    stars: starsFromScore(score),
    label,
    scorePercent: score,
    included,
    suggestions,
  };
}

export function estimateWorksheetQualityFromPrompt(input: PromptQualityInput): number {
  return scoreLivePrompt(input).scorePercent;
}

export function starsLabel(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function formatPromptQualitySummary(q: LivePromptQuality, input: PromptQualityInput): string {
  return `${starsLabel(q.stars)} ${q.label} — ${CLASS_LABELS[input.classLevel]} ${SUBJECT_LABELS[input.subject]} ${DIFFICULTY_LABELS[input.difficulty]}`;
}
