import { eq } from "drizzle-orm";
import { db, phonicsContentCacheTable } from "@workspace/db";
import { getCurriculumLevelDef } from "@workspace/phonics-curriculum";
import { CVC_WORDS } from "@workspace/phonics-sounds";
import { withSafeDb } from "./db-safe.js";
import { logger } from "./logger.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function cacheKey(level: number, vowel: string): string {
  return `cvc_l${level}_v${vowel.toLowerCase()}`;
}

/** Deterministic fallback when OpenAI is unavailable. */
function fallbackWords(level: number, vowel: string): string[] {
  const vMap: Record<string, string> = {
    a: "æ",
    e: "ɛ",
    i: "ɪ",
    o: "ɒ",
    u: "ʌ",
  };
  const ipa = vMap[vowel.toLowerCase()] ?? vowel;
  const fromBank = CVC_WORDS.filter((w) => w.phonemes.includes(ipa)).map(
    (w) => w.word,
  );
  const levelContent = getCurriculumLevelDef(
    Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6,
  ).content;
  const words = levelContent
    .map((s) => s.replace(/\.$/, "").split(/\s+/)[0]!.toLowerCase())
    .filter((w) => /^[a-z]{2,6}$/.test(w));
  return [...new Set([...fromBank, ...words])].slice(0, 10);
}

async function callOpenAiWords(prompt: string): Promise<string[] | null> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) return null;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env["OPENAI_CHAT_MODEL"]?.trim() || "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You generate decodable CVC words for children age 4–6. Reply with JSON only: {\"words\":[\"cat\",\"bat\"]}. No letter names. Short vowel focus only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { words?: string[] };
    const words = (parsed.words ?? [])
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => /^[a-z]{2,6}$/.test(w));
    return words.length > 0 ? words.slice(0, 12) : null;
  } catch (err) {
    logger.warn(
      { evt: "phonics.ai_words_fail", err },
      "OpenAI word generation failed",
    );
    return null;
  }
}

/**
 * Generate (or load cached) CVC words for a level/vowel focus.
 */
export async function generatePhonicsWordsCached(
  level: number,
  vowelFocus: string,
): Promise<string[]> {
  const key = cacheKey(level, vowelFocus);

  const cached = await withSafeDb(
    "phonics.contentAi.cacheLookup",
    () =>
      db
        .select()
        .from(phonicsContentCacheTable)
        .where(eq(phonicsContentCacheTable.cacheKey, key))
        .limit(1),
    [],
  );

  if (cached[0]?.words?.length) {
    return cached[0].words as string[];
  }

  const prompt = `Generate 10 CVC words for a 4-year-old using short vowel '${vowelFocus}'. Only lowercase a-z words, 3 letters each when possible.`;
  let words = await callOpenAiWords(prompt);
  let source = "ai";
  if (!words?.length) {
    words = fallbackWords(level, vowelFocus);
    source = "fallback";
  }

  await withSafeDb(
    "phonics.contentAi.cacheWrite",
    async () => {
      await db
        .insert(phonicsContentCacheTable)
        .values({
          cacheKey: key,
          level,
          vowelFocus,
          words,
          prompt,
          source,
        })
        .onConflictDoUpdate({
          target: [phonicsContentCacheTable.cacheKey],
          set: { words, prompt, source },
        });
    },
    undefined,
  );

  return words;
}
