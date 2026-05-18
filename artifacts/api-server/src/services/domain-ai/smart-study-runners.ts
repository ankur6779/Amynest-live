import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import { SMART_SUBJECTS, type SmartSubjectId } from "@workspace/study-zone";

const AiQuestionSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(80)).min(2).max(6),
  answer: z.string().min(1).max(80),
});
const AiResponseSchema = z.object({
  questions: z.array(AiQuestionSchema).min(1).max(10),
});

type Level = 1 | 2 | 3 | 4 | 5 | 6;

function profileFor(country: string) {
  return {
    country,
    fruit: "mango",
    treat: "ladoo",
    currencyName: "rupees",
    currency: "₹",
  };
}

export async function runSmartStudyNextQuestions(input: {
  level: Level;
  subject: SmartSubjectId;
  country: string;
  ageYears: number;
  count: number;
  excludeIds: string[];
}): Promise<{ questions: Array<{ id: string; level: Level; subject: SmartSubjectId; q: string; options: string[]; answer: string }> } | null> {
  const profile = profileFor(input.country);
  const subjectMeta = SMART_SUBJECTS.find((s) => s.id === input.subject);
  const topic = subjectMeta?.title ?? input.subject;
  const excludeIds = new Set(input.excludeIds);
  const prompt = `Generate ${input.count} math questions for a ${input.ageYears}-year-old, level ${input.level}, topic ${topic}, country ${profile.country}.
Output JSON: {"questions":[{"question":"...","options":["..."],"answer":"..."}]}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You generate kid-friendly math practice questions. Always reply with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    4500,
  );
  if (!outcome.content) return null;
  const parsed = AiResponseSchema.safeParse(JSON.parse(outcome.content));
  if (!parsed.success) return null;
  const out: Array<{
    id: string;
    level: Level;
    subject: SmartSubjectId;
    q: string;
    options: string[];
    answer: string;
  }> = [];
  parsed.data.questions.forEach((q, i) => {
    if (!q.options.includes(q.answer)) return;
    const id = `ai-L${input.level}-${input.subject}-${Date.now()}-${i}`;
    if (excludeIds.has(id)) return;
    out.push({
      id,
      level: input.level,
      subject: input.subject,
      q: q.question,
      options: q.options,
      answer: q.answer,
    });
  });
  return out.length > 0 ? { questions: out } : null;
}
