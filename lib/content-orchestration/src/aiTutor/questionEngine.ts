import type { DifficultyLevel } from "../types.js";
import type { TopicContext } from "./types.js";
import type { TutorMemory } from "./types.js";

export type GeneratedQuestion = {
  prompt: string;
  expectedKeywords: string[];
  difficulty: DifficultyLevel;
  hint: string;
  variationId: string;
};

const TOPIC_BANK: Record<string, { easy: string; medium: string; hard: string }> = {
  phonics: {
    easy: "What sound does the letter A make?",
    medium: "Which word starts with the B sound: ball or cat?",
    hard: "Can you blend the sounds in C-A-T?",
  },
  motor_skills: {
    easy: "Can you tap your nose?",
    medium: "Can you clap two times?",
    hard: "Can you hop once and freeze?",
  },
  cognitive: {
    easy: "Which is bigger: an elephant or a mouse?",
    medium: "What comes next: red, blue, red, blue, ___?",
    hard: "If you have two apples and get one more, how many?",
  },
  default: {
    easy: "Can you try this with me?",
    medium: "What do you think happens next?",
    hard: "Can you explain it in your own words?",
  },
};

function topicKey(moduleId: string): string {
  if (moduleId in TOPIC_BANK) return moduleId;
  return "default";
}

export function pickDifficultyForLevel(
  skillLevel: number,
  mistakesRecent: number,
): DifficultyLevel {
  if (mistakesRecent >= 2 || skillLevel <= 2) return "easy";
  if (skillLevel >= 4) return "hard";
  return "medium";
}

export function generateQuestion(
  ctx: TopicContext,
  memory: TutorMemory,
  mistakeCount = 0,
): GeneratedQuestion {
  const bank = TOPIC_BANK[topicKey(ctx.moduleId)] ?? TOPIC_BANK.default!;
  const difficulty = pickDifficultyForLevel(ctx.skillLevel, mistakeCount);
  const prompt =
    difficulty === "easy"
      ? bank.easy
      : difficulty === "hard"
        ? bank.hard
        : bank.medium;

  const weakHint =
    memory.weakAreas.length > 0
      ? `Remember: take your time with ${memory.weakAreas[memory.weakAreas.length - 1]}.`
      : "Listen, then try your best.";

  return {
    prompt: personalizePrompt(prompt, ctx.topic),
    expectedKeywords: extractKeywords(prompt),
    difficulty,
    hint: weakHint,
    variationId: `q_${ctx.moduleId}_${difficulty}_${Date.now() % 1000}`,
  };
}

export function generateRetryQuestion(
  original: GeneratedQuestion,
  attempt: number,
): GeneratedQuestion {
  const simpler =
    original.difficulty === "hard"
      ? "Let's try an easier one. " + softenPrompt(original.prompt)
      : softenPrompt(original.prompt);
  return {
    ...original,
    prompt: simpler,
    variationId: `${original.variationId}_retry_${attempt}`,
    hint: "Here's a tiny clue — " + original.hint.toLowerCase(),
  };
}

function personalizePrompt(prompt: string, topic: string): string {
  if (!topic || topic === "learning") return prompt;
  return prompt.replace("this", topic);
}

function softenPrompt(prompt: string): string {
  return prompt.replace("Can you", "Let's try — can you").replace("?", "?");
}

function extractKeywords(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);
}

export function evaluateChildAnswer(
  answer: string,
  question: GeneratedQuestion,
): import("./types.js").ChildAnswerEvaluation {
  const normalized = answer.toLowerCase().trim();
  if (normalized.length < 1) {
    return { correct: false, partial: false, confidence: 0 };
  }

  const hits = question.expectedKeywords.filter((k) => normalized.includes(k));
  if (hits.length >= Math.max(1, question.expectedKeywords.length - 1)) {
    return { correct: true, partial: false, confidence: 0.9 };
  }
  if (hits.length > 0 || normalized.length > 8) {
    return { correct: false, partial: true, confidence: 0.45 };
  }
  return { correct: false, partial: false, confidence: 0.2 };
}
