import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import { appendLearningZoneEnglishRule } from "../../lib/learning-zone-english.js";

const TRICK_COLORS = [
  "hsl(var(--brand-amber-500))",
  "hsl(var(--brand-violet-500))",
  "hsl(var(--brand-green-500))",
  "hsl(var(--brand-cyan-500))",
  "hsl(var(--brand-red-500))",
  "hsl(var(--brand-orange-500))",
] as const;

const TRICK_EMOJIS = ["🔟", "9️⃣", "✌️", "🌟", "5️⃣", "➕", "✖️", "🧮", "💡", "🎯"] as const;

const practiceQSchema = z.object({
  question: z.string().min(1).max(120),
  options: z.array(z.string().min(1).max(20)).min(2).max(4),
  answer: z.string().min(1).max(20),
  hint: z.string().min(3).max(160),
});

const trickSchema = z.object({
  title: z.string().min(1).max(80),
  trick: z.string().min(1).max(200),
  example: z.string().min(1).max(200),
  audioText: z.string().min(10).max(400),
  practiceQ: practiceQSchema,
});

const responseSchema = z.object({
  tricks: z.array(trickSchema).min(1).max(5),
});

export async function runSmartMathTricksAiGenerate(input: {
  age: "4-6" | "6-8";
  count: number;
  excludeIds: string[];
}): Promise<{
  tricks: Array<{
    id: string;
    age: "4-6" | "6-8";
    title: string;
    trick: string;
    example: string;
    emoji: string;
    color: string;
    audioText: string;
    practiceQ: {
      question: string;
      options: string[];
      answer: string;
      hint: string;
    };
  }>;
} | null> {
  const ageLabel = input.age === "4-6" ? "ages 4–6" : "ages 6–8";
  const excludeNote =
    input.excludeIds.length > 0
      ? ` Avoid repeating themes from ids: ${input.excludeIds.slice(0, 12).join(", ")}.`
      : "";

  const batchCount = Math.min(Math.max(input.count, 1), 5);
  const prompt = `Generate ${batchCount} fun mental-math tricks for children ${ageLabel}.
Each trick must be easy to explain aloud, with one worked example and one multiple-choice practice question (4 options, exactly one correct).
Keep language simple and encouraging.${excludeNote}
Output JSON only:
{"tricks":[{"title":"...","trick":"short rule","example":"23 + 10 = 33","audioText":"spoken explanation for TTS","practiceQ":{"question":"...","options":["a","b","c","d"],"answer":"exact option text","hint":"..."}}]}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_completion_tokens: 2500,
      messages: [
        {
          role: "system",
          content: appendLearningZoneEnglishRule(
            "You create kid-friendly mental math tricks. Reply with valid JSON only. Every practiceQ.answer must match one option exactly.",
          ),
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    20_000,
  );
  if (!outcome.content) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(outcome.content);
  } catch {
    return null;
  }

  const parsed = responseSchema.safeParse(parsedJson);
  if (!parsed.success) return null;

  const ts = Date.now();
  const tricks = parsed.data.tricks.slice(0, input.count).flatMap((t, i) => {
    const opts = t.practiceQ.options;
    const idx = opts.findIndex(
      (o) => o.trim().toLowerCase() === t.practiceQ.answer.trim().toLowerCase(),
    );
    if (idx < 0) return [];
    const answer = opts[idx]!;
    return [
      {
        id: `ai-mt-${input.age}-${ts}-${i}`,
        age: input.age,
        title: t.title,
        trick: t.trick,
        example: t.example,
        emoji: TRICK_EMOJIS[i % TRICK_EMOJIS.length]!,
        color: TRICK_COLORS[i % TRICK_COLORS.length]!,
        audioText: t.audioText,
        practiceQ: { ...t.practiceQ, answer },
      },
    ];
  });

  return tricks.length > 0 ? { tricks } : null;
}
