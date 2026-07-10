import type { WorksheetDocument, WorksheetImproveAction } from "./types.js";
import { applyWorksheetImprovement } from "./improvements.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { buildQuestionElement, nextId } from "./renderer/page-layout.js";
import type { DocumentChangeSummary } from "./types.js";

export interface ConversationalEditResult {
  document: WorksheetDocument;
  summary: string;
  action?: WorksheetImproveAction;
}

const SCALE_IMAGE_RE = /make images? larger|bigger images?|increase image size/i;
const REPLACE_RE = /replace\s+(\w+)\s+with\s+(\w+)/i;
const ADD_MATCHING_RE = /add.*matching/i;
const REDUCE_DIFFICULTY_RE = /reduce difficulty|make easier|simpler/i;

export function tryConversationalEdit(message: string, doc: WorksheetDocument): ConversationalEditResult | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  if (SCALE_IMAGE_RE.test(trimmed)) {
    const updated = structuredClone(doc);
    updated.version += 1;
    updated.meta.updatedAt = new Date().toISOString();
    let count = 0;
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "image" || (el.type === "question_block" && el.illustrationSrc)) {
          if (el.type === "image") {
            el.width = Math.min(el.width * 1.35, 200);
            el.height = Math.min(el.height * 1.35, 200);
          } else {
            el.height += 24;
            el.illustrationSrc = getIllustration(detectIllustrationFromText(el.illustrationLabel ?? el.prompt));
          }
          count += 1;
        }
      }
    }
    return { document: updated, summary: `Enlarged ${count} image(s) for better visibility.` };
  }

  const replaceMatch = trimmed.match(REPLACE_RE);
  if (replaceMatch?.[1] && replaceMatch[2]) {
    const [from, to] = [replaceMatch[1], replaceMatch[2]];
    const updated = structuredClone(doc);
    updated.version += 1;
    updated.meta.updatedAt = new Date().toISOString();
    const re = new RegExp(from, "gi");
    updated.meta.topic = updated.meta.topic.replace(re, to);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "text") el.content = el.content.replace(re, to);
        if (el.type === "question_block") {
          el.prompt = el.prompt.replace(re, to);
          if (el.illustrationLabel) el.illustrationLabel = el.illustrationLabel.replace(re, to);
          el.illustrationSrc = getIllustration(detectIllustrationFromText(to));
        }
      }
    }
    return { document: updated, summary: `Replaced "${from}" with "${to}" across the worksheet.` };
  }

  if (ADD_MATCHING_RE.test(trimmed)) {
    const updated = structuredClone(doc);
    const lastPage = updated.pages[updated.pages.length - 1];
    if (lastPage) {
      const n = lastPage.elements.filter((e) => e.type === "question_block").length + 1;
      const y = lastPage.elements.reduce((m, e) => Math.max(m, e.y + e.height), 200) + 24;
      const el = buildQuestionElement({
        questionNumber: n,
        questionType: "match",
        prompt: `${n}  Match the pictures to the words.`,
        options: ["Option A", "Option B"],
        x: 28,
        y,
        width: 555,
        height: 100,
      });
      lastPage.elements.push(el);
      updated.version += 1;
      updated.meta.updatedAt = new Date().toISOString();
      return { document: updated, summary: "Added a matching activity to the last page." };
    }
  }

  if (REDUCE_DIFFICULTY_RE.test(trimmed)) {
    return {
      document: applyWorksheetImprovement(doc, "easier"),
      summary: "Reduced difficulty — simpler vocabulary and easier activities.",
      action: "easier",
    };
  }

  return null;
}

export function summarizeDocumentChanges(before: WorksheetDocument, after: WorksheetDocument): DocumentChangeSummary {
  const highlights: string[] = [];
  let changed = 0;

  if (before.meta.difficulty !== after.meta.difficulty) {
    highlights.push(`Difficulty: ${before.meta.difficulty} → ${after.meta.difficulty}`);
    changed += 1;
  }
  if (before.meta.colorMode !== after.meta.colorMode) {
    highlights.push(`Color mode: ${before.meta.colorMode} → ${after.meta.colorMode}`);
    changed += 1;
  }

  const beforeQ = before.pages.flatMap((p) => p.elements.filter((e) => e.type === "question_block"));
  const afterQ = after.pages.flatMap((p) => p.elements.filter((e) => e.type === "question_block"));
  if (afterQ.length !== beforeQ.length) {
    highlights.push(`Questions: ${beforeQ.length} → ${afterQ.length}`);
    changed += 1;
  }

  for (let i = 0; i < Math.min(beforeQ.length, afterQ.length); i++) {
    const b = beforeQ[i]!;
    const a = afterQ[i]!;
    if (b.prompt !== a.prompt) {
      highlights.push(`Updated question ${b.questionNumber}`);
      changed += 1;
    }
    if (b.height !== a.height || b.width !== a.width) {
      highlights.push(`Resized question ${b.questionNumber}`);
      changed += 1;
    }
  }

  return {
    summary: highlights.length ? highlights[0]! : "Worksheet updated",
    changedElements: changed || 1,
    highlights: highlights.slice(0, 6),
  };
}
