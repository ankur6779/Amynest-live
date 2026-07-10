import { CLASS_LABELS, DIFFICULTY_LABELS, LPS_SCHOOL_NAME, SUBJECT_LABELS } from "./constants.js";
import { getLpsStandard } from "./lps-standards.js";
import type {
  EnhancePromptRequest,
  ReferenceImageMode,
  WorksheetReferenceContext,
} from "./types.js";

const ACTIVITY_BY_SUBJECT: Record<string, string[]> = {
  english: ["colouring", "matching", "beginning sounds", "tracing", "reading"],
  math: ["counting", "number tracing", "picture addition/subtraction", "pattern completion"],
  evs: ["circle the correct", "matching animals/plants", "labelling diagrams"],
  hindi: ["Swar/Vyanjan tracing", "picture-word match", "fill in the blank"],
  phonics: ["beginning sounds", "rhyming match", "letter circle"],
  drawing: ["colouring", "draw and label", "creative outline activities"],
  gk: ["tick the correct", "match flags/symbols", "fill in the blank"],
};

function referenceSummary(refs: WorksheetReferenceContext[] | undefined): string[] {
  if (!refs?.length) return [];
  return refs.map((r) => {
    const parts = [`${r.filename} (${r.kind})`];
    if (r.pageCount) parts.push(`${r.pageCount} page(s)`);
    if (r.layoutHints?.length) parts.push(`layout: ${r.layoutHints.join(", ")}`);
    if (r.textSnippet) parts.push(`context: ${r.textSnippet.slice(0, 120)}`);
    return parts.join(" — ");
  });
}

function imageModeInstruction(mode: ReferenceImageMode | undefined): string {
  switch (mode) {
    case "same_style":
      return "Match illustration style, borders, and visual hierarchy from uploaded references (original artwork only — never copy copyrighted images).";
    case "similar_style":
      return "Use a similar illustration style inspired by references — simple outlines, kid-friendly, printable.";
    case "images_only":
      return "Prioritize reusing reference images as worksheet illustrations where appropriate (teacher-uploaded assets only).";
    case "ignore_images":
      return "Use references for layout and question style only; generate fresh illustrations.";
    default:
      return "Use references for layout inspiration only; create original questions and illustrations.";
  }
}

/** Local fallback — rich prompt without API */
export function enhancePromptLocal(req: EnhancePromptRequest): string {
  const standard = getLpsStandard(req.classLevel);
  const activities = ACTIVITY_BY_SUBJECT[req.subject] ?? ACTIVITY_BY_SUBJECT.english!;
  const qPerPage = standard.questionsPerPage[req.difficulty];
  const totalQ = qPerPage * req.pageCount;
  const refs = referenceSummary(req.references);

  const lines = [
    `Create a professionally designed ${CLASS_LABELS[req.classLevel]} worksheet for ${LPS_SCHOOL_NAME}.`,
    ``,
    `Teacher request: ${req.prompt.trim()}`,
    ``,
    `Subject: ${SUBJECT_LABELS[req.subject]}`,
    `Difficulty: ${DIFFICULTY_LABELS[req.difficulty]}`,
    `Pages: ${req.pageCount} (A4 printable)`,
    req.language && req.language !== "english" ? `Language: ${req.language}` : null,
    ``,
    `Include approximately ${totalQ} varied activities such as: ${activities.slice(0, 4).join(", ")}.`,
    `Preferred activity types for this class: ${standard.preferredActivities.slice(0, 6).join(", ")}.`,
    ``,
    `Design requirements:`,
    `- Large, age-appropriate illustrations with generous white space`,
    `- Black outline printable images suitable for colouring where relevant`,
    `- Wide writing spaces (min ${standard.writingAreaMinHeight}px activity areas)`,
    `- Kid-friendly fonts sized for ${CLASS_LABELS[req.classLevel]} (${standard.minPromptFontSize}pt+ prompts)`,
    `- Balanced question diversity — no repeated activity types back-to-back`,
    `Learning objectives: age-appropriate skills for ${CLASS_LABELS[req.classLevel]} ${SUBJECT_LABELS[req.subject]}.`,
    `Bloom's taxonomy: remember, understand, apply — balanced across questions.`,
    `Question diversity: mix colouring, matching, tracing, reading, and counting.`,
    `Writing balance: include tracing/handwriting lines where appropriate.`,
    `Reading balance: short decodable sentences suitable for class level.`,
    `Colouring balance: black-outline printable illustrations.`,
    `Image style: simple, child-safe, no copyrighted artwork.`,
    `Assessment goals: ${req.difficulty === "hard" ? "challenge capable learners" : "build confidence"}.`,
    `Worksheet spacing: generous white space, LPS A4 margins, bordered pages.`,
    `Print optimization: low-clutter, high contrast, teacher-ready PDF.`,
    `- Never duplicate copyrighted content — generate original questions inspired by references only`,
    imageModeInstruction(undefined),
    refs.length ? `\nReference files (layout/style inspiration only):\n${refs.map((r) => `- ${r}`).join("\n")}` : null,
    ``,
    `Output: print-friendly, teacher-ready worksheet with clear instructions for children.`,
  ];

  return lines.filter((l): l is string => l != null).join("\n");
}

export function buildEnhancePromptSystemPrompt(): string {
  return `You are an expert LPS (Lucknow Public School) worksheet prompt engineer.
Rewrite the teacher's short prompt into a detailed, production-ready AI generation brief.
Include: class/age, difficulty, activity mix, layout, illustration style, writing space, font sizing, learning objectives, Bloom levels, LPS standards, print requirements.
If reference files are listed, instruct the generator to be INSPIRED by layout/question style only — never copy copyrighted text or images.
Return ONLY JSON: { "enhancedPrompt": string }`;
}

export function buildEnhancePromptUserPayload(req: EnhancePromptRequest): string {
  return JSON.stringify({
    teacherPrompt: req.prompt,
    class: CLASS_LABELS[req.classLevel],
    subject: SUBJECT_LABELS[req.subject],
    difficulty: DIFFICULTY_LABELS[req.difficulty],
    pages: req.pageCount,
    language: req.language ?? "english",
    references: req.references?.map((r) => ({
      filename: r.filename,
      kind: r.kind,
      pages: r.pageCount,
      images: r.imageCount,
      hints: r.layoutHints,
      snippet: r.textSnippet?.slice(0, 200),
    })),
  });
}

export function effectiveGenerationPrompt(req: EnhancePromptRequest & { enhancedPrompt?: string }): string {
  return (req.enhancedPrompt?.trim() || req.prompt.trim());
}
