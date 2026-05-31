import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import { SUBJECT_LABELS, type OlympiadSubject } from "@workspace/olympiad";

const InsightResponseSchema = z.object({
  insight: z.string().min(1).max(400),
  parentTip: z.string().min(1).max(300),
});

export async function runOlympiadInsight(input: {
  childName: string;
  ageYears: number;
  totalPoints: number;
  streak: number;
  overallAccuracyPct: number;
  bySubject: Record<OlympiadSubject, { correct: number; total: number }>;
}): Promise<{ insight: string; parentTip: string } | null> {
  const subjectLines = (Object.entries(input.bySubject) as [OlympiadSubject, { correct: number; total: number }][])
    .filter(([, v]) => v.total > 0)
    .map(([s, v]) => `${SUBJECT_LABELS[s]}: ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)`)
    .join("; ");

  const prompt = `Write a brief personalized olympiad coaching summary for parent and child.

Child: ${input.childName}, age ${input.ageYears}
Total points: ${input.totalPoints}, streak: ${input.streak} days
Overall accuracy: ${input.overallAccuracyPct}%
By subject: ${subjectLines || "no data yet"}

Output JSON only:
{"insight":"2 sentences for the child — encouraging, specific","parentTip":"1 sentence actionable tip for the parent"}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_completion_tokens: 350,
      messages: [
        {
          role: "system",
          content: "You are Amy, a warm learning coach for children. JSON only, kid-safe tone.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    15_000,
  );
  if (!outcome.content) return null;
  try {
    return InsightResponseSchema.parse(JSON.parse(outcome.content));
  } catch {
    return null;
  }
}
