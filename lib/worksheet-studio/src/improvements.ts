import type { WorksheetDocument, WorksheetImproveAction } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { nextId } from "./renderer/page-layout.js";
import { generateWorksheetVariant } from "./teacher-productivity.js";
import { applyPrintMode } from "./print-optimizer.js";

export function applyWorksheetImprovement(
  doc: WorksheetDocument,
  action: WorksheetImproveAction,
): WorksheetDocument {
  const updated = structuredClone(doc);
  updated.meta.updatedAt = new Date().toISOString();
  updated.version += 1;

  switch (action) {
    case "easier":
      updated.meta.difficulty = "easy";
      break;
    case "harder":
      updated.meta.difficulty = "hard";
      break;
    case "to_bw":
      updated.meta.colorMode = "bw";
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "image") el.outlineOnly = true;
          if (el.type === "text") el.color = "#111111";
        }),
      );
      break;
    case "to_color":
      updated.meta.colorMode = "color";
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "image") el.outlineOnly = false;
        }),
      );
      break;
    case "answer_key":
      updated.meta.isAnswerKey = true;
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "question_block" && !el.prompt.includes("→")) {
            el.prompt = `${el.prompt} → (Answer)`;
          }
        }),
      );
      break;
    case "translate_hindi":
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "text") el.content = `[हिंदी] ${el.content}`;
          if (el.type === "question_block") el.prompt = `[हिंदी] ${el.prompt}`;
        }),
      );
      break;
    case "translate_english":
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "text") el.content = el.content.replace(/^\[हिंदी\]\s*/, "");
          if (el.type === "question_block") el.prompt = el.prompt.replace(/^\[हिंदी\]\s*/, "");
        }),
      );
      break;
    case "more_questions": {
      const regen = generateWorksheetLocal({
        prompt: doc.prompt,
        classLevel: doc.meta.classLevel,
        subject: doc.meta.subject,
        difficulty: doc.meta.difficulty,
        pageCount: Math.min(4, doc.meta.pageCount + 1),
        answerKey: doc.meta.isAnswerKey,
      });
      return { ...regen, id: doc.id, version: updated.version };
    }
    case "fewer_questions": {
      const regen = generateWorksheetLocal({
        prompt: doc.prompt,
        classLevel: doc.meta.classLevel,
        subject: doc.meta.subject,
        difficulty: doc.meta.difficulty,
        pageCount: Math.max(1, doc.meta.pageCount - 1),
        answerKey: doc.meta.isAnswerKey,
      });
      return { ...regen, id: doc.id, version: updated.version };
    }
    case "regenerate_images":
    case "replace_images":
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "question_block" && el.illustrationEmoji) {
            el.illustrationLabel = `${el.illustrationLabel ?? "Picture"} (outline)`;
          }
        }),
      );
      break;
    case "increase_spacing":
      updated.pages.forEach((p) => {
        let lastY = 0;
        p.elements.forEach((el) => {
          if (el.type === "question_block") {
            el.y = lastY > 0 ? lastY + el.height + 32 : el.y + 16;
            lastY = el.y + el.height;
          }
        });
      });
      break;
    case "more_writing":
    case "handwriting_practice":
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "question_block") {
            el.answerLine = true;
            el.height = Math.max(el.height, 48);
          }
        }),
      );
      break;
    case "easier_words":
      updated.meta.difficulty = "easy";
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "question_block") {
            el.prompt = el.prompt.replace(/\(Challenge!\)/, "").replace(/Complete|Write/, "Circle");
          }
        }),
      );
      break;
    case "reduce_colour":
      updated.pages.forEach((p) =>
        p.elements.forEach((el) => {
          if (el.type === "question_block" && el.questionType === "colour") {
            el.questionType = "circle";
            el.prompt = el.prompt.replace(/[Cc]olou?r/, "Circle");
          }
        }),
      );
      break;
    case "homework_mode":
      return { ...generateWorksheetVariant(doc, "homework"), version: updated.version };
    case "assessment_mode":
      return { ...generateWorksheetVariant(doc, "assessment"), version: updated.version };
    case "revision_questions":
      return { ...generateWorksheetVariant(doc, "revision"), version: updated.version };
    case "blooms_taxonomy": {
      const regen = generateWorksheetLocal({
        prompt: `${doc.prompt} — apply Bloom's taxonomy (remember, understand, apply)`,
        classLevel: doc.meta.classLevel,
        subject: doc.meta.subject,
        difficulty: doc.meta.difficulty,
        pageCount: doc.meta.pageCount,
      });
      return { ...regen, id: doc.id, version: updated.version };
    }
    case "low_ink":
      return applyPrintMode(updated, "low_ink");
    default:
      break;
  }

  updated.id = doc.id;
  return updated;
}

export function duplicateElement<T extends { id: string; x: number; y: number }>(el: T): T {
  return { ...structuredClone(el), id: nextId("dup"), x: el.x + 12, y: el.y + 12 };
}
