import type { PostGenerationRecommendation, WorksheetDocument } from "./types.js";

export function getPostGenerationRecommendations(doc: WorksheetDocument): PostGenerationRecommendation[] {
  const base: PostGenerationRecommendation[] = [
    { id: "homework", label: "Homework Version", description: "Parent-friendly instructions, moderate difficulty", action: "homework_mode", variant: "homework" },
    { id: "assessment", label: "Assessment Version", description: "Classroom test with varied question types", action: "assessment_mode", variant: "assessment" },
    { id: "revision", label: "Revision Sheet", description: "Quick review of the same topic", action: "revision_questions", variant: "revision" },
    { id: "writing", label: "Writing Practice", description: "More tracing and handwriting lines", action: "more_writing", variant: "writing" },
    { id: "coloring", label: "Coloring Sheet", description: "Outline images for colouring", action: "to_bw", variant: "coloring" },
    { id: "low_ink", label: "Low Ink Print", description: "Eco-friendly classroom printing", action: "low_ink" },
    { id: "answer_key", label: "Answer Key", description: "Teacher answer sheet", action: "answer_key" },
    { id: "parent", label: "Parent Activity", description: "Simple home practice version", action: "homework_mode", variant: "homework" },
  ];

  if (doc.meta.subject === "english" || doc.meta.subject === "phonics") {
    base.push({ id: "flashcards", label: "Flashcards", description: "Vocabulary cards from this topic", action: "regenerate_variant", variant: "flashcards" });
  }

  return base.slice(0, 8);
}
