import type { AiContentNamespace } from "./aiContentCacheService.js";
import { saveCachedItems, contentItemId } from "./aiContentCacheService.js";
import { runLifeSkillsAiGenerate, runPhonicsLoadMoreWords } from "./domain-ai/life-skills-runners.js";
import { runSmartMathTricksAiGenerate } from "./domain-ai/smart-math-tricks-runners.js";
import { runSmartStudyNextQuestions } from "./domain-ai/smart-study-runners.js";
import { runOlympiadNextQuestions } from "./domain-ai/olympiad-runners.js";
import { runSpellingAiGenerate } from "./domain-ai/spelling-runners.js";
import { runTtsPregenerate } from "./domain-ai/tts-pregenerate-runner.js";
import { isPregenerationPaused } from "./admin-ops-store.js";
import { logger } from "../lib/logger.js";
import { aiQuestionsToOlympiad } from "@workspace/olympiad";
import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadSubject,
} from "@workspace/olympiad";
import type { Level, SmartSubjectId } from "@workspace/study-zone";
import type { LifeSkillAgeBand } from "@workspace/life-skills";
import {
  buildWeeklySeedMatrix,
  collectTtsTextsFromItems,
  type SeedSectionJob,
} from "./learningContentSeedMatrix.js";

export {
  buildWeeklySeedMatrix,
  collectTtsTextsFromItems,
  type SeedSectionJob,
} from "./learningContentSeedMatrix.js";

const TTS_BATCH_SIZE = 50;
const KEY_DELAY_MS = 400;
const AI_BATCH_SIZE = 5;

export type WeeklySeedStats = {
  weekId: string;
  dryRun: boolean;
  keysAttempted: number;
  keysSaved: number;
  itemsGenerated: number;
  keysFailed: number;
  ttsTexts: number;
  ttsSucceeded: number;
  ttsFailed: number;
  ttsCached: number;
  errors: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function currentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86_400_000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseItemsPerKey(): number {
  const raw = Number(process.env["LEARNING_SEED_ITEMS_PER_KEY"] ?? 14);
  if (!Number.isFinite(raw)) return 14;
  return Math.min(Math.max(Math.floor(raw), 4), 20);
}

function parseSectionsFilter(): Set<AiContentNamespace> | null {
  const raw = process.env["LEARNING_SEED_SECTIONS"]?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as AiContentNamespace[],
  );
}

const OLYMPIAD_AGE_YEARS: Record<OlympiadAgeBand, number> = {
  tiny: 4,
  junior: 7,
  senior: 11,
};

async function generateBatchForJob(
  job: SeedSectionJob,
  count: number,
  weekId: string,
  excludeIds: string[],
  excludeWords: string[],
): Promise<unknown[]> {
  switch (job.section) {
    case "smart_math_tricks": {
      const age = String(job.params.age ?? "4-6") as "4-6" | "6-8";
      const result = await runSmartMathTricksAiGenerate({
        age,
        count: Math.min(count, AI_BATCH_SIZE),
        excludeIds,
      });
      return result?.tricks ?? [];
    }
    case "spelling": {
      const result = await runSpellingAiGenerate({
        age: String(job.params.age ?? "4-6") as "2-4" | "4-6" | "6-8" | "8-10+",
        difficulty: String(job.params.difficulty ?? "medium") as
          | "easy"
          | "medium"
          | "hard",
        count: Math.min(count, AI_BATCH_SIZE),
      });
      return result.words ?? [];
    }
    case "phonics": {
      const result = await runPhonicsLoadMoreWords({
        level: Number(job.params.level ?? 1),
        vowelFocus: String(job.params.vowelFocus ?? "a"),
        count: Math.min(count, AI_BATCH_SIZE),
        excludeWords,
      });
      return result?.words ?? [];
    }
    case "life_skills": {
      const result = await runLifeSkillsAiGenerate({
        ageBand: String(job.params.ageBand ?? "kid") as LifeSkillAgeBand,
        count: Math.min(count, AI_BATCH_SIZE),
        excludeIds,
      });
      return result?.tasks ?? [];
    }
    case "smart_study": {
      const level = Number(job.params.level ?? 1) as Level;
      const subject = String(job.params.subject ?? "addition") as SmartSubjectId;
      const country = String(job.params.country ?? "IN");
      const ageYears = Math.min(3 + level, 12);
      const result = await runSmartStudyNextQuestions({
        level,
        subject,
        country,
        ageYears,
        count: Math.min(count, AI_BATCH_SIZE),
        excludeIds,
      });
      return result?.questions ?? [];
    }
    case "olympiad": {
      const ageBand = String(job.params.ageBand ?? "junior") as OlympiadAgeBand;
      const difficulty = String(job.params.difficulty ?? "medium") as OlympiadDifficulty;
      const subject = String(job.params.subject ?? "math") as OlympiadSubject;
      const country = String(job.params.country ?? "IN");
      const ageYears = OLYMPIAD_AGE_YEARS[ageBand];
      const aiRaw = await runOlympiadNextQuestions({
        ageBand,
        difficulty,
        subject,
        country,
        ageYears,
        count: Math.min(count, AI_BATCH_SIZE),
        excludeIds,
      });
      return (aiRaw?.questions ?? []).flatMap((row, i) =>
        aiQuestionsToOlympiad(
          [row],
          row.subject ?? subject,
          ageBand,
          difficulty,
          country,
          `seed-${weekId}-${job.label}-${Date.now()}-${i}`,
        ),
      );
    }
    default:
      return [];
  }
}

async function generateItemsForJob(
  job: SeedSectionJob,
  count: number,
  weekId: string,
): Promise<unknown[]> {
  const out: unknown[] = [];
  const excludeIds: string[] = [];
  const excludeWords: string[] = [];
  let stagnant = 0;

  while (out.length < count && stagnant < 2) {
    const need = Math.min(AI_BATCH_SIZE, count - out.length);
    const batch = await generateBatchForJob(
      job,
      need,
      weekId,
      excludeIds,
      excludeWords,
    );
    if (batch.length === 0) {
      stagnant += 1;
      continue;
    }
    stagnant = 0;
    for (const item of batch) {
      const id = contentItemId(item);
      if (id) excludeIds.push(id);
      if (job.section === "phonics" && typeof item === "string") {
        excludeWords.push(item.toLowerCase());
      }
    }
    out.push(...batch);
    await sleep(150);
  }

  return out.slice(0, count);
}

async function pregenerateTtsBatched(texts: string[]): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
}> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
  let succeeded = 0;
  let failed = 0;
  let cached = 0;

  for (let i = 0; i < unique.length; i += TTS_BATCH_SIZE) {
    const batch = unique.slice(i, i + TTS_BATCH_SIZE);
    const result = await runTtsPregenerate({ texts: batch, mode: "default" });
    succeeded += result.succeeded;
    failed += result.failed;
    cached += result.cached;
    if (i + TTS_BATCH_SIZE < unique.length) {
      await sleep(200);
    }
  }

  return { total: unique.length, succeeded, failed, cached };
}

export async function runWeeklyLearningContentSeed(opts?: {
  itemsPerKey?: number;
  dryRun?: boolean;
  skipTts?: boolean;
  sections?: AiContentNamespace[];
}): Promise<WeeklySeedStats> {
  const weekId = currentWeekId();
  const itemsPerKey = opts?.itemsPerKey ?? parseItemsPerKey();
  const dryRun = opts?.dryRun ?? process.env["LEARNING_SEED_DRY_RUN"] === "true";
  const skipTts =
    opts?.skipTts ??
    (process.env["LEARNING_SEED_SKIP_TTS"] === "true" || isPregenerationPaused());

  const sectionFilter =
    opts?.sections && opts.sections.length > 0
      ? new Set(opts.sections)
      : parseSectionsFilter();

  const stats: WeeklySeedStats = {
    weekId,
    dryRun,
    keysAttempted: 0,
    keysSaved: 0,
    itemsGenerated: 0,
    keysFailed: 0,
    ttsTexts: 0,
    ttsSucceeded: 0,
    ttsFailed: 0,
    ttsCached: 0,
    errors: [],
  };

  const allTtsTexts: string[] = [];
  let jobs = buildWeeklySeedMatrix();
  if (sectionFilter) {
    jobs = jobs.filter((j) => sectionFilter.has(j.section));
  }

  logger.info(
    {
      evt: "learning.seed.start",
      weekId,
      dryRun,
      skipTts,
      itemsPerKey,
      keyCount: jobs.length,
    },
    "weekly learning content seed starting",
  );

  for (const job of jobs) {
    stats.keysAttempted += 1;
    try {
      const items = await generateItemsForJob(job, itemsPerKey, weekId);
      if (items.length === 0) {
        stats.keysFailed += 1;
        stats.errors.push(`${job.label}: empty generation`);
        continue;
      }

      stats.itemsGenerated += items.length;
      allTtsTexts.push(...collectTtsTextsFromItems(job.section, items));

      if (!dryRun) {
        await saveCachedItems({
          namespace: job.section,
          lookupKey: job.lookupKey,
          items,
          source: "ai",
        });
        stats.keysSaved += 1;
      }

      logger.info(
        {
          evt: "learning.seed.key_done",
          label: job.label,
          section: job.section,
          count: items.length,
          dryRun,
        },
        "learning seed key complete",
      );
    } catch (err) {
      stats.keysFailed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`${job.label}: ${msg}`);
      logger.warn(
        { evt: "learning.seed.key_failed", label: job.label, err: msg },
        "learning seed key failed",
      );
    }

    await sleep(KEY_DELAY_MS);
  }

  if (!skipTts && allTtsTexts.length > 0 && !dryRun) {
    const tts = await pregenerateTtsBatched(allTtsTexts);
    stats.ttsTexts = tts.total;
    stats.ttsSucceeded = tts.succeeded;
    stats.ttsFailed = tts.failed;
    stats.ttsCached = tts.cached;
  }

  logger.info(
    { evt: "learning.seed.done", ...stats },
    "weekly learning content seed finished",
  );

  return stats;
}

/** Safe wrapper for cron — never throws. */
export async function runWeeklyLearningContentSeedSafe(
  opts?: Parameters<typeof runWeeklyLearningContentSeed>[0],
): Promise<WeeklySeedStats> {
  try {
    return await runWeeklyLearningContentSeed(opts);
  } catch (err) {
    logger.error(
      { evt: "learning.seed.fatal", err },
      "weekly learning content seed crashed",
    );
    return {
      weekId: currentWeekId(),
      dryRun: false,
      keysAttempted: 0,
      keysSaved: 0,
      itemsGenerated: 0,
      keysFailed: 0,
      ttsTexts: 0,
      ttsSucceeded: 0,
      ttsFailed: 0,
      ttsCached: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}
