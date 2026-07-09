import type { WorksheetDocument, WorksheetGenerateRequest, WorksheetQuestionBlock } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { assembleDocument, nextId, resetIdCounter } from "./renderer/page-layout.js";

const ANSWER_HINTS: Partial<Record<WorksheetQuestionBlock["questionType"], (q: WorksheetQuestionBlock) => string>> = {
  circle: (q) => q.options?.[0] ?? "First option",
  match: (q) => q.options?.join(" ↔ ") ?? "Match pairs",
  math: (q) => {
    const m = q.prompt.match(/(\d+)\s*[\+\-]\s*(\d+)/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      return q.prompt.includes("+") ? String(a + b) : String(a - b);
    }
    return "—";
  },
  count: () => "Count carefully",
  beginning_sounds: (q) => q.options?.[0] ?? "—",
  odd_one_out: (q) => q.options?.at(-1) ?? "—",
};

export function generateAnswerKeyDocument(source: WorksheetDocument): WorksheetDocument {
  resetIdCounter();
  const pages = source.pages.map((page, idx) => ({
    ...page,
    id: nextId("ak_page"),
    elements: page.elements.map((el) => {
      if (el.type !== "question_block") return el;
      const hint = ANSWER_HINTS[el.questionType]?.(el) ?? "(Answer)";
      return { ...el, id: nextId("ak_q"), prompt: `${el.prompt} → ${hint}` };
    }),
  }));
  return assembleDocument(
    { ...source.meta, isAnswerKey: true, title: `${source.meta.title} — Answer Key`, updatedAt: new Date().toISOString() },
    pages,
    source.prompt,
    nextId("ak_doc"),
  );
}

export function generateWorksheetWithAnswerKey(req: WorksheetGenerateRequest) {
  const worksheet = generateWorksheetLocal({ ...req, answerKey: false });
  return { worksheet, answerKey: generateAnswerKeyDocument(worksheet) };
}
