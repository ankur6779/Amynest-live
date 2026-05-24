import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import {
  countryProfile,
  type OlympiadAgeBand,
  type OlympiadDifficulty,
  type OlympiadSubject,
} from "@workspace/olympiad";

const AiQuestionSchema = z.object({
  subject: z.enum(["math", "science", "reasoning", "gk"]).optional(),
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(80)).min(2).max(4),
  answer: z.string().min(1).max(80),
  explanation: z.string().max(400).optional(),
});
const AiResponseSchema = z.object({
  questions: z.array(AiQuestionSchema).min(1).max(10),
});

const SUBJECT_HINTS: Record<OlympiadSubject, string> = {
  math: "math olympiad MCQs (operations, patterns, word problems)",
  science: "science olympiad MCQs (biology, physics, chemistry basics)",
  reasoning: "logic and reasoning MCQs (patterns, odd-one-out, sequences)",
  gk: "general knowledge MCQs",
};

export async function runOlympiadNextQuestions(input: {
  ageBand: OlympiadAgeBand;
  difficulty: OlympiadDifficulty;
  subject: OlympiadSubject | "mixed";
  country: string;
  ageYears: number;
  count: number;
  excludeIds: string[];
}): Promise<{
  questions: Array<{
    subject: OlympiadSubject;
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
  }>;
} | null> {
  const profile = countryProfile(input.country);
  const excludeNote =
    input.excludeIds.length > 0
      ? ` Avoid repeating themes from these ids: ${input.excludeIds.slice(0, 20).join(", ")}.`
      : "";

  const subjectLine =
    input.subject === "mixed"
      ? `Cover all four subjects (math, science, reasoning, gk) across the ${input.count} questions — at least one each. Include "subject" on every item.`
      : `Subject: ${SUBJECT_HINTS[input.subject]}.`;

  const prompt = `Generate ${input.count} olympiad-style multiple-choice questions for a ${input.ageYears}-year-old child.
Age band: ${input.ageBand}. Difficulty: ${input.difficulty}. ${subjectLine}
Localize for ${profile.label}: use ${profile.currencyName} (${profile.currency}), ${profile.fruit}, ${profile.schoolItem}, ${profile.transport}, and ${profile.festival} in examples where natural.${excludeNote}
Rules: kid-friendly, unambiguous, exactly one correct option, 4 options each, no trick questions.
Output JSON only: {"questions":[{"subject":"math|science|reasoning|gk","question":"...","options":["A","B","C","D"],"answer":"exact option text","explanation":"one line why"}]}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content:
            "You generate age-appropriate olympiad MCQs for children. Reply with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    5000,
  );
  if (!outcome.content) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(outcome.content);
  } catch {
    return null;
  }

  const parsed = AiResponseSchema.safeParse(parsedJson);
  if (!parsed.success) return null;

  const fallbackSubject = input.subject === "mixed" ? "math" : input.subject;
  const out: Array<{
    subject: OlympiadSubject;
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
  }> = [];

  for (const q of parsed.data.questions) {
    if (!q.options.includes(q.answer)) continue;
    out.push({
      subject: q.subject ?? fallbackSubject,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    });
  }
  return out.length > 0 ? { questions: out } : null;
}
