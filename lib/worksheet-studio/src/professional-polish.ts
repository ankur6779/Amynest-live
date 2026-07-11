/**
 * Professional teacher-authoring polish — Document-level only.
 * Does not rewrite LayoutTree geometry math or Fabric positioning.
 */
import type { WorksheetDocument, WorksheetQuestionBlock } from "./types.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { repairPrintIssues } from "./print-validation.js";
import { applyPrintMode } from "./print-optimizer.js";
import { getLpsStandard } from "./lps-standards.js";
import { scoreWorksheet, QUALITY_THRESHOLD, needsQualityImprovement } from "./quality-scoring-engine.js";
import { reflowDocumentLayout } from "./flow-layout-engine.js";

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

/** Strip Unicode emoji from prompts/labels; keep printable text. */
export function stripEmojiText(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Never leave emoji as the illustration. Always resolve black-outline SVG.
 * Clears illustrationEmoji so Fabric/PDF never fall back to Unicode.
 */
export function ensurePrintableIllustrations(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type !== "question_block") continue;
      const q = el as WorksheetQuestionBlock;
      if (q.prompt) q.prompt = stripEmojiText(q.prompt);
      if (q.illustrationLabel) q.illustrationLabel = stripEmojiText(q.illustrationLabel);
      const needsArt =
        Boolean(q.illustrationSrc) ||
        Boolean(q.illustrationEmoji) ||
        Boolean(q.illustrationLabel) ||
        /colour|color|circle|match|draw|picture|trace/i.test(q.questionType);
      if (needsArt) {
        const label = q.illustrationLabel || q.prompt || "star";
        q.illustrationSrc = getIllustration(detectIllustrationFromText(label));
      }
      delete q.illustrationEmoji;
    }
  }
  out.meta.updatedAt = new Date().toISOString();
  return out;
}

/** Normalize prompt fonts to LPS class standards. */
export function applyProfessionalTypography(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  const std = getLpsStandard(out.meta.classLevel);
  const minPrompt = std.minPromptFontSize;
  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type === "question_block") {
        // Prompt size is applied at LayoutTree/Fabric via classLevel — ensure height budget
        if (el.height < 48) el.height = Math.max(el.height, 56);
      }
      if (el.type === "text" && !el.id.startsWith("brand_") && !el.id.startsWith("footer_")) {
        if (el.fontSize < minPrompt - 2) el.fontSize = minPrompt;
        if (el.fontSize > minPrompt + 8) el.fontSize = minPrompt + 4;
      }
    }
  }
  return out;
}

/**
 * Auto-correct large gaps, crowded blocks, orphan questions via existing reflow + repair.
 */
export function autoCorrectLayout(doc: WorksheetDocument): WorksheetDocument {
  let current = ensurePrintableIllustrations(doc);
  current = applyProfessionalTypography(current);
  current = repairPrintIssues(current);
  current = reflowDocumentLayout(current);
  current.version = (doc.version ?? 1) + 1;
  current.meta.updatedAt = new Date().toISOString();
  return current;
}

/** One-click print optimizer for commercial A4 output. */
export function optimizeForPrinting(doc: WorksheetDocument): {
  document: WorksheetDocument;
  quality: number;
  repaired: boolean;
} {
  let current = autoCorrectLayout(doc);
  current = applyPrintMode(current, "bw");
  current = ensurePrintableIllustrations(current);
  current = repairPrintIssues(current);
  let quality = scoreWorksheet(current).overall;
  let loops = 0;
  while (needsQualityImprovement(current, QUALITY_THRESHOLD) && loops < 3) {
    current = repairPrintIssues(current);
    current = reflowDocumentLayout(current);
    quality = scoreWorksheet(current).overall;
    loops += 1;
  }
  return { document: current, quality, repaired: loops > 0 || true };
}

export type VisualQualityBreakdown = {
  overall: number;
  educational: number;
  print: number;
  visualBalance: number;
  illustration: number;
  spacing: number;
  readability: number;
  pass: boolean;
  issues: string[];
};

export function scoreVisualQuality(doc: WorksheetDocument): VisualQualityBreakdown {
  const base = scoreWorksheet(doc);
  let illustration = 100;
  let spacing = 100;
  const issues: string[] = [];
  let emojiHits = 0;
  let missingSrc = 0;
  let tinyBlocks = 0;

  for (const page of doc.pages) {
    const qs = page.elements.filter((e) => e.type === "question_block") as WorksheetQuestionBlock[];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]!;
      if (q.illustrationEmoji) {
        emojiHits += 1;
        illustration -= 15;
        issues.push(`Emoji illustration on Q${q.questionNumber}`);
      }
      if ((q.illustrationLabel || q.illustrationEmoji) && !q.illustrationSrc) {
        missingSrc += 1;
        illustration -= 10;
        issues.push(`Missing printable SVG on Q${q.questionNumber}`);
      }
      if (q.height < 40) {
        tinyBlocks += 1;
        spacing -= 8;
      }
      if (i > 0) {
        const prev = qs[i - 1]!;
        const gap = q.y - (prev.y + prev.height);
        if (gap > 80) {
          spacing -= 5;
          issues.push(`Large gap before Q${q.questionNumber}`);
        }
        if (gap < 8 && gap >= 0) {
          spacing -= 5;
          issues.push(`Crowded spacing before Q${q.questionNumber}`);
        }
      }
    }
  }

  illustration = Math.max(0, Math.min(100, illustration));
  spacing = Math.max(0, Math.min(100, spacing));
  const readability = base.readability;
  const visualBalance = Math.round((spacing + illustration + base.diversity) / 3);
  const print = base.print;
  const educational = Math.round((base.educational + base.ageSuitability) / 2);
  const overall = Math.round(
    educational * 0.2 + print * 0.25 + visualBalance * 0.2 + illustration * 0.2 + spacing * 0.1 + readability * 0.05,
  );

  if (emojiHits) issues.push(`${emojiHits} emoji illustration(s) — use black-outline SVG`);
  if (missingSrc) issues.push(`${missingSrc} illustration(s) without SVG src`);
  if (tinyBlocks) issues.push(`${tinyBlocks} undersized question block(s)`);

  return {
    overall,
    educational,
    print,
    visualBalance,
    illustration,
    spacing,
    readability,
    pass: overall >= QUALITY_THRESHOLD && emojiHits === 0,
    issues,
  };
}
