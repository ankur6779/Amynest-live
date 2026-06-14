import type { DifficultyLevel } from "../types.js";
import type { TopicContext } from "./types.js";
import type { TutorMemory } from "./types.js";
import {
  pickBankQuestion,
  type BankQuestion,
  type LearnAmyAgeGroup,
  resolveLearnAmyAgeGroup,
} from "./learnWithAmyQuestionBank.js";

export type GeneratedQuestion = {
  prompt: string;
  expectedKeywords: string[];
  difficulty: DifficultyLevel;
  hint: string;
  variationId: string;
  options: [string, string, string, string];
  correctIndex: number;
  bankId: string;
  ageGroup: LearnAmyAgeGroup;
  topicKey: string;
};

export function pickDifficultyForLevel(
  skillLevel: number,
  mistakesRecent: number,
): DifficultyLevel {
  if (mistakesRecent >= 2 || skillLevel <= 2) return "easy";
  if (skillLevel >= 4) return "hard";
  return "medium";
}

function bankToGenerated(
  bank: BankQuestion,
  memory: TutorMemory,
  ageGroup: LearnAmyAgeGroup,
): GeneratedQuestion {
  const correctAnswer = bank.options[bank.correctIndex] ?? "";
  const weakHint =
    memory.weakAreas.length > 0
      ? `Remember: take your time with ${memory.weakAreas[memory.weakAreas.length - 1]}.`
      : "Listen, then pick the best answer.";

  return {
    prompt: bank.prompt,
    expectedKeywords: extractKeywords(correctAnswer, bank.prompt),
    difficulty: bank.difficulty,
    hint: weakHint,
    variationId: bank.id,
    options: bank.options,
    correctIndex: bank.correctIndex,
    bankId: bank.id,
    ageGroup,
    topicKey: bank.topic,
  };
}

export function generateQuestion(
  ctx: TopicContext,
  memory: TutorMemory,
  mistakeCount = 0,
  ageYears = 6,
  excludeIds: string[] = [],
): GeneratedQuestion {
  const difficulty = pickDifficultyForLevel(ctx.skillLevel, mistakeCount);
  const ageGroup = resolveLearnAmyAgeGroup(ageYears);
  const bank = pickBankQuestion({
    ageYears,
    topic: ctx.topic,
    moduleId: ctx.moduleId,
    difficulty,
    excludeIds,
  });
  return bankToGenerated(bank, memory, ageGroup);
}

export function generateRetryQuestion(
  original: GeneratedQuestion,
  attempt: number,
  ageYears = 6,
): GeneratedQuestion {
  const simplerDifficulty: DifficultyLevel =
    original.difficulty === "hard"
      ? "medium"
      : original.difficulty === "medium"
        ? "easy"
        : "easy";

  const bank = pickBankQuestion({
    ageYears,
    topic: original.topicKey,
    moduleId: original.topicKey,
    difficulty: simplerDifficulty,
    excludeIds: [original.bankId],
  });

  const generated = bankToGenerated(
    bank,
    { mistakesHistory: [], strengths: [], weakAreas: [] },
    resolveLearnAmyAgeGroup(ageYears),
  );

  return {
    ...generated,
    prompt:
      attempt >= 2
        ? `Let's try an easier one. ${generated.prompt}`
        : `Good try! ${generated.prompt}`,
    variationId: `${generated.variationId}_retry_${attempt}`,
    hint: "Here's a tiny clue — " + generated.hint.toLowerCase(),
  };
}

function extractKeywords(correctAnswer: string, prompt: string): string[] {
  const fromAnswer = correctAnswer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (fromAnswer.length > 0) return fromAnswer.slice(0, 4);

  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);
}

function normalizeAnswer(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

export function evaluateChildAnswer(
  answer: string,
  question: GeneratedQuestion,
): import("./types.js").ChildAnswerEvaluation {
  const normalized = normalizeAnswer(answer);
  if (normalized.length < 1) {
    return { correct: false, partial: false, confidence: 0 };
  }

  const correctOption = question.options[question.correctIndex];
  if (correctOption && normalizeAnswer(correctOption) === normalized) {
    return { correct: true, partial: false, confidence: 1 };
  }

  for (let i = 0; i < question.options.length; i++) {
    const opt = question.options[i];
    if (opt && normalizeAnswer(opt) === normalized) {
      return i === question.correctIndex
        ? { correct: true, partial: false, confidence: 1 }
        : { correct: false, partial: false, confidence: 0.15 };
    }
  }

  const hits = question.expectedKeywords.filter((k) => normalized.includes(k));
  if (hits.length >= Math.max(1, question.expectedKeywords.length - 1)) {
    return { correct: true, partial: false, confidence: 0.85 };
  }
  if (hits.length > 0 || normalized.length > 8) {
    return { correct: false, partial: true, confidence: 0.45 };
  }
  return { correct: false, partial: false, confidence: 0.2 };
}
