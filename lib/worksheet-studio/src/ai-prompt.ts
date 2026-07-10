import type { WorksheetGenerateRequest } from "./types.js";
import { CLASS_LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS } from "./constants.js";

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
  return `You are an expert primary-school worksheet designer for Lucknow Public School (LPS), India.
Output ONLY valid JSON matching this schema:
{
  "title": string,
  "topic": string,
  "questions": [
    {
      "type": "colour"|"circle"|"match"|"trace"|"draw"|"join"|"tick"|"cross"|"cut_paste"|"fill_blank"|"missing_letters"|"beginning_sounds"|"odd_one_out"|"count"|"pattern"|"sorting"|"picture_recognition"|"reading"|"short_sentences"|"phonics"|"writing"|"math"|"evs"|"hindi",
      "prompt": string,
      "options": string[] (optional),
      "answerLine": boolean (optional),
      "illustrationEmoji": string (optional, single emoji for B&W outline substitute),
      "illustrationLabel": string (optional),
      "answer": string (optional, for answer key mode)
    }
  ]
}
Rules:
- Age-appropriate, large readable wording for Indian pre-primary / primary.
- Balance activity types: colour, circle, match, trace, count, writing, reading — never repeat the same type back-to-back.
- Never duplicate question prompts. Vary answer option order.
- Questions MUST be numbered implicitly in order (we add "Question N." in UI).
- Printable A4: concise prompts, no clipped text, generous white space per LPS class standards.
- Nursery/LKG: fewer words, more pictures. Grade 1/2: more writing and reading.
- Use simple emoji or text labels instead of copyrighted images.
- For colouring, mention "black outline" style via illustrationLabel.
- Progress difficulty gently across questions.
- When teacher uploaded reference files, match layout/style inspiration — create ORIGINAL questions.
- No markdown. No extra keys.`;
}

export function buildWorksheetAiUserPrompt(req: WorksheetGenerateRequest): string {
  const teacherPrompt = req.enhancedPrompt?.trim() || req.prompt;
  return JSON.stringify({
    teacherPrompt,
    class: CLASS_LABELS[req.classLevel],
    subject: SUBJECT_LABELS[req.subject],
    difficulty: DIFFICULTY_LABELS[req.difficulty],
    pages: req.pageCount,
    answerKey: req.answerKey ?? false,
    language: req.language ?? "english",
    questionsNeeded: req.pageCount * (req.difficulty === "easy" ? 4 : req.difficulty === "medium" ? 5 : 6),
    references: referenceBlock(req),
  });
}
