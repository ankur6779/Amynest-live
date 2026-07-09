import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { generateAnswerKeyDocument } from "./answer-key-engine.js";
import { nextId } from "./renderer/page-layout.js";

export type WorksheetVariant =
  | "duplicate"
  | "similar"
  | "next"
  | "homework"
  | "revision"
  | "assessment"
  | "answer_key"
  | "oral"
  | "classroom";

export function duplicateWorksheetDocument(doc: WorksheetDocument): WorksheetDocument {
  const copy = structuredClone(doc);
  copy.id = nextId("ws");
  copy.version = 1;
  copy.meta.title = `${copy.meta.title} (Copy)`;
  copy.meta.createdAt = new Date().toISOString();
  copy.meta.updatedAt = copy.meta.createdAt;
  return copy;
}

export function buildVariantRequest(
  doc: WorksheetDocument,
  variant: WorksheetVariant,
): WorksheetGenerateRequest | null {
  const base: WorksheetGenerateRequest = {
    prompt: doc.prompt,
    classLevel: doc.meta.classLevel,
    subject: doc.meta.subject,
    difficulty: doc.meta.difficulty,
    pageCount: doc.meta.pageCount,
    answerKey: false,
  };

  switch (variant) {
    case "duplicate":
      return null;
    case "similar":
      return { ...base, prompt: `${doc.prompt} — similar practice` };
    case "next":
      return {
        ...base,
        prompt: `${doc.meta.topic} — next lesson`,
        pageCount: Math.min(4, base.pageCount + 1),
      };
    case "homework":
      return {
        ...base,
        prompt: `${doc.meta.topic} — homework practice`,
        difficulty: "easy",
        pageCount: Math.min(2, base.pageCount),
      };
    case "revision":
      return {
        ...base,
        prompt: `${doc.meta.topic} — revision worksheet`,
        difficulty: "medium",
      };
    case "assessment":
      return {
        ...base,
        prompt: `${doc.meta.topic} — assessment`,
        difficulty: "hard",
        pageCount: Math.min(2, base.pageCount),
      };
    case "answer_key":
      return { ...base, answerKey: true };
    case "oral":
      return {
        ...base,
        prompt: `${doc.meta.topic} — oral activity (speak and circle)`,
        difficulty: "easy",
        pageCount: 1,
      };
    case "classroom":
      return {
        ...base,
        prompt: `${doc.meta.topic} — classroom group activity`,
        difficulty: "medium",
        pageCount: Math.min(3, base.pageCount + 1),
      };
    default:
      return base;
  }
}

export function generateWorksheetVariant(
  doc: WorksheetDocument,
  variant: WorksheetVariant,
): WorksheetDocument {
  if (variant === "duplicate") return duplicateWorksheetDocument(doc);
  if (variant === "answer_key") return generateAnswerKeyDocument(doc);

  const req = buildVariantRequest(doc, variant);
  if (!req) return duplicateWorksheetDocument(doc);

  const generated = generateWorksheetLocal(req);
  return {
    ...generated,
    id: variant === "similar" || variant === "next" ? nextId("ws") : doc.id,
    prompt: req.prompt,
  };
}
