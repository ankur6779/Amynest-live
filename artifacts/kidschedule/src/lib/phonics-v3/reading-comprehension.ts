/**
 * Age-appropriate comprehension after decodable books.
 */
import type { DecodableBook } from "./decodable-books";

export type ComprehensionQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  kind: "who" | "what" | "sequence" | "picture" | "feeling";
};

export type ComprehensionResult = {
  bookId: string;
  scorePct: number;
  correct: number;
  total: number;
  answers: { questionId: string; correct: boolean }[];
};

export function buildComprehensionQuiz(
  book: DecodableBook,
  difficulty: "easy" | "medium" | "hard" = "easy",
): ComprehensionQuestion[] {
  const prompts = [...book.comprehensionPrompts];
  if (difficulty === "easy") return prompts.slice(0, 2).map(toQ(book.id));
  if (difficulty === "medium") return prompts.slice(0, 3).map(toQ(book.id));
  return prompts.map(toQ(book.id));
}

function toQ(bookId: string) {
  return (
    p: DecodableBook["comprehensionPrompts"][number],
    i: number,
  ): ComprehensionQuestion => ({
    id: `${bookId}-q${i}`,
    question: p.question,
    options: p.options,
    correctIndex: p.correctIndex,
    kind: p.kind,
  });
}

export function scoreComprehensionQuiz(
  bookId: string,
  questions: ComprehensionQuestion[],
  selectedIndexes: number[],
): ComprehensionResult {
  const answers = questions.map((q, i) => ({
    questionId: q.id,
    correct: selectedIndexes[i] === q.correctIndex,
  }));
  const correct = answers.filter((a) => a.correct).length;
  const total = questions.length || 1;
  return {
    bookId,
    scorePct: Math.round((correct / total) * 100),
    correct,
    total: questions.length,
    answers,
  };
}

/** Adaptive difficulty from prior comprehension average. */
export function adaptiveComprehensionDifficulty(
  recentScores: number[],
): "easy" | "medium" | "hard" {
  if (recentScores.length === 0) return "easy";
  const avg =
    recentScores.reduce((s, n) => s + n, 0) / recentScores.length;
  if (avg >= 85) return "hard";
  if (avg >= 65) return "medium";
  return "easy";
}
