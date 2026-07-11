import type { WorksheetGenerateRequest } from "./types.js";
import { CLASS_LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS } from "./constants.js";
import {
  AI_QUESTION_TYPES,
  AI_WORKSHEET_GENERATOR_VERSION,
  defaultA4PageSize,
} from "./ai-response-contract.js";
import {
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_SCHEMA_VERSION,
} from "./live-pipeline-audit.js";

function referenceBlock(req: WorksheetGenerateRequest): Record<string, unknown> | null {
  if (!req.references?.length) return null;
  return {
    referenceCount: req.references.length,
    imageMode: req.imageMode ?? "similar_style",
    files: req.references.map((r) => ({
      name: r.filename,
      kind: r.kind,
      pages: r.pageCount,
      images: r.imageCount,
      layoutHints: r.layoutHints,
      textSnippet: r.textSnippet?.slice(0, 300),
    })),
    instruction:
      "Use references for layout, question style, and illustration inspiration ONLY. Generate original content. Never copy copyrighted text or images verbatim.",
  };
}

export function buildWorksheetAiSystemPrompt(): string {
  const pageSize = defaultA4PageSize();
  return `You are an expert primary-school worksheet designer for Lucknow Public School (LPS), India.
You MUST output JSON that matches the structured schema exactly. Every root field is required.

Fixed values (must match exactly):
- schemaVersion: ${WORKSHEET_SCHEMA_VERSION}
- layoutVersion: ${WORKSHEET_LAYOUT_VERSION}
- generatorVersion: "${AI_WORKSHEET_GENERATOR_VERSION}"
- pageSize: { "width": ${pageSize.width}, "height": ${pageSize.height} }

Required root fields:
schemaVersion, layoutVersion, generatorVersion, title, topic, prompt, pageSize, pages, questions

pages[] items: { pageNumber, questionIds[] } — at least one page, each with ≥1 question id
questions[] items: {
  id, questionType, prompt, pageNumber,
  options (string[] or null),
  answerLine (boolean),
  illustrationEmoji (string or null),
  illustrationLabel (string or null),
  answer (string or null)
}

questionType must be one of: ${AI_QUESTION_TYPES.join("|")}

Rules:
- Age-appropriate, large readable wording for Indian pre-primary / primary.
- Balance activity types — never repeat the same type back-to-back.
- Never duplicate question prompts. Every prompt must be non-empty.
- Every question id must appear on exactly one page; pageNumber must match.
- At least 1 page and at least 1 question.
- Nursery/LKG: fewer words, more pictures. Grade 1/2: more writing and reading.
- Use simple emoji or text labels instead of copyrighted images.
- No markdown. No extra keys. No partial documents.`;
}

export function buildWorksheetAiUserPrompt(req: WorksheetGenerateRequest): string {
  const teacherPrompt = req.enhancedPrompt?.trim() || req.prompt;
  const pageSize = defaultA4PageSize();
  return JSON.stringify({
    teacherPrompt,
    class: CLASS_LABELS[req.classLevel],
    subject: SUBJECT_LABELS[req.subject],
    difficulty: DIFFICULTY_LABELS[req.difficulty],
    pages: req.pageCount,
    answerKey: req.answerKey ?? false,
    language: req.language ?? "english",
    questionsNeeded: req.pageCount * (req.difficulty === "easy" ? 4 : req.difficulty === "medium" ? 5 : 6),
    requiredContract: {
      schemaVersion: WORKSHEET_SCHEMA_VERSION,
      layoutVersion: WORKSHEET_LAYOUT_VERSION,
      generatorVersion: AI_WORKSHEET_GENERATOR_VERSION,
      pageSize,
    },
    references: referenceBlock(req),
  });
}

export function buildWorksheetAiSchemaRepairPrompt(errors: string[]): string {
  return [
    "The previous response did not match the required schema.",
    "Return ONLY a complete JSON object that satisfies the structured schema.",
    "Do not omit required root fields: schemaVersion, layoutVersion, generatorVersion, title, topic, prompt, pageSize, pages, questions.",
    "Validation errors from the previous attempt:",
    ...errors.slice(0, 12).map((e) => `- ${e}`),
  ].join("\n");
}
