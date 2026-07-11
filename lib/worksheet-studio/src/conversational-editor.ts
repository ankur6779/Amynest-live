import type { WorksheetDocument, WorksheetImproveAction } from "./types.js";
import { applyWorksheetImprovement } from "./improvements.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { buildQuestionElement, createEmptyPage } from "./renderer/page-layout.js";
import { CONTENT_WIDTH, reflowDocumentLayout } from "./flow-layout-engine.js";
import type { DocumentChangeSummary } from "./types.js";
import {
  autoCorrectLayout,
  ensurePrintableIllustrations,
  optimizeForPrinting,
  stripEmojiText,
} from "./professional-polish.js";
import { applyPrintMode } from "./print-optimizer.js";

export interface ConversationalEditResult {
  document: WorksheetDocument;
  summary: string;
  action?: WorksheetImproveAction;
}

const SCALE_IMAGE_RE = /make images? (larger|bigger)|bigger images?|increase image size/i;
const SHRINK_IMAGE_RE = /make images? (smaller|tinier)|smaller images?|reduce image size/i;
const REPLACE_RE = /replace\s+(\w+)\s+with\s+(\w+)/i;
const ADD_MATCHING_RE = /add.*matching/i;
const REDUCE_DIFFICULTY_RE = /reduce difficulty|make easier|simpler/i;
const REDUCE_SPACING_RE = /reduce spacing|less space|tighten|crowded|too much (white\s*)?space/i;
const INCREASE_SPACING_RE = /increase spacing|more space|loosen/i;
const REMOVE_Q_RE = /remove\s+question\s+(\d+)/i;
const MOVE_NEXT_PAGE_RE = /move\s+question\s+(\d+)\s+to\s+(the\s+)?next\s+page/i;
const ADD_QUESTIONS_RE = /add\s+(\d+)\s+more\s+questions?/i;
const PRINTABLE_ART_RE = /replace emojis?|black[- ]?outline|printable.*(illustration|image)|real worksheet images?|line art/i;
const BW_RE = /black\s*(and|&)?\s*white|print(able)?\s*in\s*b\s*&?\s*w|make printable/i;
const OPTIMIZE_PRINT_RE = /optimiz\w*\s+(for\s+)?print|print optim/i;
const TRACING_RE = /convert to tracing|tracing worksheet|more tracing/i;
const HANDWRITING_RE = /increase handwriting|more handwriting|handwriting practice/i;
const IMPROVE_Q_RE = /improve\s+question\s+(\d+)/i;
const SIMPLIFY_Q_RE = /make\s+question\s+(\d+)\s+easier|simplify\s+question\s+(\d+)/i;
const TRACE_Q_RE = /convert\s+question\s+(\d+)\s+to\s+tracing/i;
const TRANSLATE_Q_RE = /translate\s+question\s+(\d+)\s+to\s+hindi/i;
const TRANSLATE_HI_RE = /translate\s+to\s+hindi|hindi/i;

function bump(doc: WorksheetDocument): WorksheetDocument {
  const updated = structuredClone(doc);
  updated.version += 1;
  updated.meta.updatedAt = new Date().toISOString();
  return updated;
}

function renumber(doc: WorksheetDocument): void {
  let n = 0;
  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (el.type === "question_block") {
        n += 1;
        el.questionNumber = n;
        el.prompt = el.prompt.replace(/^\d+\s{1,2}/, `${n}  `);
      }
    }
  }
}

export function tryConversationalEdit(message: string, doc: WorksheetDocument): ConversationalEditResult | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  if (OPTIMIZE_PRINT_RE.test(trimmed)) {
    const { document, quality } = optimizeForPrinting(doc);
    return { document, summary: `Optimized for printing (quality ${quality}/100).` };
  }

  const improveQ = trimmed.match(IMPROVE_Q_RE);
  if (improveQ?.[1]) {
    const n = Number(improveQ[1]);
    const updated = bump(doc);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "question_block" && el.questionNumber === n) {
          el.prompt = stripEmojiText(el.prompt);
          el.illustrationSrc = getIllustration(detectIllustrationFromText(el.illustrationLabel ?? el.prompt));
          delete el.illustrationEmoji;
          el.height = Math.max(el.height, 64);
        }
      }
    }
    return { document: autoCorrectLayout(updated), summary: `Improved Question ${n} (typography + printable illustration).` };
  }

  const simplifyQ = trimmed.match(SIMPLIFY_Q_RE);
  if (simplifyQ) {
    const n = Number(simplifyQ[1] ?? simplifyQ[2]);
    const updated = bump(doc);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "question_block" && el.questionNumber === n) {
          el.prompt = el.prompt.replace(/\(Challenge!\)/g, "").replace(/Write|Complete/gi, "Circle");
        }
      }
    }
    return { document: updated, summary: `Simplified Question ${n}.` };
  }

  const traceQ = trimmed.match(TRACE_Q_RE);
  if (traceQ?.[1]) {
    const n = Number(traceQ[1]);
    const updated = bump(doc);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "question_block" && el.questionNumber === n) {
          el.questionType = "trace";
          el.prompt = stripEmojiText(el.prompt).replace(/Circle|Colour|Color|Write/gi, "Trace");
          el.answerLine = true;
        }
      }
    }
    return { document: updated, summary: `Converted Question ${n} to tracing.` };
  }

  const translateQ = trimmed.match(TRANSLATE_Q_RE);
  if (translateQ?.[1]) {
    return {
      document: applyWorksheetImprovement(doc, "translate_hindi"),
      summary: `Translated worksheet (including Question ${translateQ[1]}) to Hindi.`,
      action: "translate_hindi",
    };
  }

  if (PRINTABLE_ART_RE.test(trimmed)) {
    const document = ensurePrintableIllustrations(bump(doc));
    return { document, summary: "Replaced emoji/icons with printable black-outline illustrations." };
  }

  if (BW_RE.test(trimmed) && !/colour|color mode/i.test(trimmed)) {
    let document = applyPrintMode(bump(doc), "bw");
    document = ensurePrintableIllustrations(document);
    return { document, summary: "Converted worksheet to black-and-white print mode.", action: "to_bw" };
  }

  if (SCALE_IMAGE_RE.test(trimmed)) {
    const updated = bump(doc);
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
            delete el.illustrationEmoji;
          }
          count += 1;
        }
      }
    }
    return { document: updated, summary: `Enlarged ${count} image(s) for better visibility.` };
  }

  if (SHRINK_IMAGE_RE.test(trimmed)) {
    const updated = bump(doc);
    let count = 0;
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "question_block" && el.illustrationSrc) {
          el.height = Math.max(56, el.height - 20);
          count += 1;
        }
      }
    }
    return { document: reflowDocumentLayout(updated), summary: `Reduced ${count} illustration size(s).` };
  }

  const replaceMatch = trimmed.match(REPLACE_RE);
  if (replaceMatch?.[1] && replaceMatch[2]) {
    const [from, to] = [replaceMatch[1], replaceMatch[2]];
    const updated = bump(doc);
    const re = new RegExp(from, "gi");
    updated.meta.topic = updated.meta.topic.replace(re, to);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "text") el.content = el.content.replace(re, to);
        if (el.type === "question_block") {
          el.prompt = el.prompt.replace(re, to);
          if (el.illustrationLabel) el.illustrationLabel = el.illustrationLabel.replace(re, to);
          el.illustrationSrc = getIllustration(detectIllustrationFromText(to));
          delete el.illustrationEmoji;
        }
      }
    }
    return { document: updated, summary: `Replaced "${from}" with "${to}" across the worksheet.` };
  }

  if (REDUCE_SPACING_RE.test(trimmed)) {
    return {
      document: autoCorrectLayout(doc),
      summary: "Tightened spacing and corrected uneven gaps.",
    };
  }

  if (INCREASE_SPACING_RE.test(trimmed)) {
    return {
      document: applyWorksheetImprovement(doc, "increase_spacing"),
      summary: "Increased spacing between questions.",
      action: "increase_spacing",
    };
  }

  const removeQ = trimmed.match(REMOVE_Q_RE);
  if (removeQ?.[1]) {
    const n = Number(removeQ[1]);
    const updated = bump(doc);
    for (const page of updated.pages) {
      page.elements = page.elements.filter(
        (el) => !(el.type === "question_block" && el.questionNumber === n),
      );
    }
    renumber(updated);
    return { document: reflowDocumentLayout(updated), summary: `Removed Question ${n}.` };
  }

  const moveQ = trimmed.match(MOVE_NEXT_PAGE_RE);
  if (moveQ?.[1]) {
    const n = Number(moveQ[1]);
    const updated = bump(doc);
    let moved: (typeof updated.pages)[0]["elements"][0] | null = null;
    let fromPageIndex = -1;
    for (let pi = 0; pi < updated.pages.length; pi++) {
      const page = updated.pages[pi]!;
      const idx = page.elements.findIndex(
        (el) => el.type === "question_block" && el.questionNumber === n,
      );
      if (idx >= 0) {
        moved = page.elements.splice(idx, 1)[0]!;
        fromPageIndex = pi;
        break;
      }
    }
    if (moved && fromPageIndex >= 0) {
      let target = updated.pages[fromPageIndex + 1];
      if (!target) {
        const last = updated.pages[updated.pages.length - 1]!;
        target = createEmptyPage(last.pageNumber + 1);
        updated.pages.push(target);
        updated.meta.pageCount = updated.pages.length;
      }
      target.elements.push(moved);
      renumber(updated);
      return {
        document: reflowDocumentLayout(updated),
        summary: `Moved Question ${n} to page ${target.pageNumber}.`,
      };
    }
  }

  const addQs = trimmed.match(ADD_QUESTIONS_RE);
  if (addQs?.[1]) {
    const count = Math.min(6, Math.max(1, Number(addQs[1])));
    return {
      document: applyWorksheetImprovement(doc, "more_questions"),
      summary: `Added practice questions (requested ${count}).`,
      action: "more_questions",
    };
  }

  if (ADD_MATCHING_RE.test(trimmed)) {
    const updated = bump(doc);
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
        width: CONTENT_WIDTH,
        height: 100,
        illustrationLabel: "star",
        illustrationSrc: getIllustration("star"),
      });
      lastPage.elements.push(el);
      return { document: updated, summary: "Added a matching activity to the last page." };
    }
  }

  if (TRACING_RE.test(trimmed)) {
    const updated = bump(doc);
    for (const page of updated.pages) {
      for (const el of page.elements) {
        if (el.type === "question_block") {
          el.questionType = "trace";
          el.prompt = stripEmojiText(el.prompt).replace(/Circle|Colour|Color|Write/gi, "Trace");
          el.answerLine = true;
        }
      }
    }
    return { document: updated, summary: "Converted activities toward a tracing worksheet." };
  }

  if (HANDWRITING_RE.test(trimmed)) {
    return {
      document: applyWorksheetImprovement(doc, "handwriting_practice"),
      summary: "Increased handwriting practice with answer lines.",
      action: "handwriting_practice",
    };
  }

  if (TRANSLATE_HI_RE.test(trimmed) && /translate/i.test(trimmed)) {
    return {
      document: applyWorksheetImprovement(doc, "translate_hindi"),
      summary: "Translated worksheet prompts to Hindi.",
      action: "translate_hindi",
    };
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
    if (b.illustrationSrc !== a.illustrationSrc || b.illustrationEmoji !== a.illustrationEmoji) {
      highlights.push(`Updated illustration on Q${b.questionNumber}`);
      changed += 1;
    }
  }

  return {
    summary: highlights.length ? highlights[0]! : "Worksheet updated",
    changedElements: changed || 1,
    highlights: highlights.slice(0, 6),
  };
}
