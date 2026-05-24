import { and, eq, sql } from "drizzle-orm";
import { db, phonicsContentTable } from "@workspace/db";
import { generatePhonicsWordsCached } from "./phonicsContentAi.js";
import { logger } from "./logger.js";
import { withSafeDb } from "./db-safe.js";

const VOWEL_ROTATION = ["a", "e", "i", "o", "u"] as const;
const DRIP_AGE_GROUPS = ["3_4y", "4_5y"] as const;

function weekIndex(d = new Date()): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.floor(dayOfYear / 7);
}

function curriculumLevelForWeek(week: number): number {
  return (week % 4) + 2;
}

function vowelForWeek(week: number): string {
  return VOWEL_ROTATION[week % VOWEL_ROTATION.length]!;
}

function cvcSoundLine(word: string): string {
  const letters = word.split("");
  return `${letters.join(". ")}. ${word}.`;
}

function cvcBlendHint(word: string): string {
  return word.split("").join("–");
}

async function maxLevelForAgeGroup(ageGroup: string): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${phonicsContentTable.level}), 0)::int` })
    .from(phonicsContentTable)
    .where(eq(phonicsContentTable.ageGroup, ageGroup));
  return rows[0]?.max ?? 0;
}

async function symbolExists(ageGroup: string, symbol: string): Promise<boolean> {
  const rows = await db
    .select({ id: phonicsContentTable.id })
    .from(phonicsContentTable)
    .where(
      and(
        eq(phonicsContentTable.ageGroup, ageGroup),
        eq(phonicsContentTable.symbol, symbol),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export interface PhonicsContentDripStats {
  ageGroup: string;
  wordsRequested: number;
  wordsInserted: number;
  vowel: string;
  level: number;
}

/**
 * Append AI-generated CVC words into phonics_content (Phase 3 weekly drip).
 * Idempotent — skips symbols that already exist for the age group.
 */
export async function runPhonicsContentDripForAgeGroup(
  ageGroup: (typeof DRIP_AGE_GROUPS)[number],
  opts?: { week?: number; maxWords?: number },
): Promise<PhonicsContentDripStats> {
  const week = opts?.week ?? weekIndex();
  const level = curriculumLevelForWeek(week);
  const vowel = vowelForWeek(week);
  const maxWords = opts?.maxWords ?? 8;

  const words = await generatePhonicsWordsCached(level, vowel);
  const slice = words.slice(0, maxWords);
  let inserted = 0;
  let nextLevel = (await maxLevelForAgeGroup(ageGroup)) + 1;

  for (const word of slice) {
    const symbol = word.trim().toLowerCase();
    if (!/^[a-z]{2,6}$/.test(symbol)) continue;
    if (await symbolExists(ageGroup, symbol)) continue;

    await db.insert(phonicsContentTable).values({
      ageGroup,
      level: nextLevel++,
      type: "word",
      symbol,
      sound: cvcSoundLine(symbol),
      example: cvcBlendHint(symbol),
      emoji: "📖",
      hint: "New word — blend the sounds",
      active: true,
    });
    inserted++;
  }

  return {
    ageGroup,
    wordsRequested: slice.length,
    wordsInserted: inserted,
    vowel,
    level,
  };
}

export async function runPhonicsContentDripBatch(): Promise<PhonicsContentDripStats[]> {
  const results: PhonicsContentDripStats[] = [];
  for (const ageGroup of DRIP_AGE_GROUPS) {
    try {
      const stat = await runPhonicsContentDripForAgeGroup(ageGroup);
      results.push(stat);
      logger.info(
        { evt: "phonics.content_drip.done", ...stat },
        "phonics AI content drip completed",
      );
    } catch (err) {
      logger.error(
        {
          evt: "phonics.content_drip.error",
          ageGroup,
          err: err instanceof Error ? err.message : String(err),
        },
        "phonics content drip failed for age group",
      );
    }
  }
  return results;
}

/** Manual / cron entry — safe when DB unavailable. */
export async function runPhonicsContentDripSafe(): Promise<PhonicsContentDripStats[]> {
  return withSafeDb(() => runPhonicsContentDripBatch(), []);
}
