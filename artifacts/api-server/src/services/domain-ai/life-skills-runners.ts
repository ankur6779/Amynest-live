import { z } from "zod";
import { chatCompletionWithTimeout } from "../openai-chat.js";
import type {
  LifeSkillAgeBand,
  LifeSkillCategory,
  LifeSkillDifficulty,
} from "@workspace/life-skills";

const localizedTextSchema = z.object({
  en: z.string().min(1).max(200),
  hi: z.string().max(200).optional(),
  hinglish: z.string().max(200).optional(),
});

const aiTaskSchema = z.object({
  category: z.enum([
    "hygiene",
    "social",
    "responsibility",
    "emotional",
    "money",
    "time",
    "self_care",
    "chores",
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  title: localizedTextSchema,
  description: localizedTextSchema,
  parentTip: localizedTextSchema,
});

const aiResponseSchema = z.object({
  tasks: z.array(aiTaskSchema).min(1).max(8),
});

export async function runLifeSkillsAiGenerate(input: {
  ageBand: LifeSkillAgeBand;
  count: number;
  excludeIds: string[];
}): Promise<{
  tasks: Array<{
    id: string;
    ageBand: LifeSkillAgeBand;
    category: LifeSkillCategory;
    difficulty: LifeSkillDifficulty;
    title: { en: string; hi?: string; hinglish?: string };
    description: { en: string; hi?: string; hinglish?: string };
    parentTip: { en: string; hi?: string; hinglish?: string };
  }>;
} | null> {
  const excludeNote =
    input.excludeIds.length > 0
      ? ` Avoid repeating themes from ids: ${input.excludeIds.slice(0, 15).join(", ")}.`
      : "";

  const bandLabel = {
    toddler: "2–4 years",
    preschool: "5–6 years",
    kid: "7–10 years",
    teen: "11–15 years",
  }[input.ageBand];

  const prompt = `Generate ${input.count} practical life-skill tasks for a child aged ${bandLabel}.
Each task should be doable at home with a parent, age-appropriate, and positive.
Categories: hygiene, social, responsibility, emotional, money, time, self_care, chores.
Mix difficulties (easy/medium/hard).${excludeNote}
Output JSON only: {"tasks":[{"category":"...","difficulty":"easy|medium|hard","title":{"en":"..."},"description":{"en":"..."},"parentTip":{"en":"..."}}]}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content:
            "You create kid-friendly life skill activities for parents and children. Reply with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    6000,
  );
  if (!outcome.content) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(outcome.content);
  } catch {
    return null;
  }

  const parsed = aiResponseSchema.safeParse(parsedJson);
  if (!parsed.success) return null;

  const ts = Date.now();
  const tasks = parsed.data.tasks.slice(0, input.count).map((t, i) => ({
    id: `ai-ls-${input.ageBand}-${ts}-${i}`,
    ageBand: input.ageBand,
    category: t.category as LifeSkillCategory,
    difficulty: t.difficulty as LifeSkillDifficulty,
    title: t.title,
    description: t.description,
    parentTip: t.parentTip,
  }));

  return tasks.length > 0 ? { tasks } : null;
}

export async function runPhonicsLoadMoreWords(input: {
  level: number;
  vowelFocus: string;
  count: number;
  excludeWords: string[];
}): Promise<{ words: string[] } | null> {
  const excludeNote =
    input.excludeWords.length > 0
      ? ` Do not repeat: ${input.excludeWords.slice(0, 30).join(", ")}.`
      : "";

  const prompt = `Generate ${input.count} decodable CVC words for a 4–5 year old.
Level ${input.level}, short vowel focus '${input.vowelFocus}'. Lowercase a-z only, 3 letters when possible.${excludeNote}
Output JSON: {"words":["cat","map",...]}`;

  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You generate decodable CVC words for phonics practice. Reply with JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    8000,
  );
  if (!outcome.content) return null;

  try {
    const parsed = JSON.parse(outcome.content) as { words?: string[] };
    const words = (parsed.words ?? [])
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => /^[a-z]{2,6}$/.test(w))
      .filter((w) => !input.excludeWords.includes(w));
    return words.length > 0 ? { words: words.slice(0, input.count) } : null;
  } catch {
    return null;
  }
}
