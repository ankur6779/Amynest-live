import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  parentProfilesTable,
  usageDailyTable,
} from "@workspace/db";
import {
  getOrCreateSubscription,
  isPremiumNow,
  type FeatureKey,
} from "./subscriptionService.js";
import {
  buildAiContentLookupKey,
  fetchCachedItems,
  saveCachedItems,
  type AiContentNamespace,
} from "./aiContentCacheService.js";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import { waitForJobResult } from "../queue/index.js";
import { isBullMqActive } from "../queue/ai-job-queue.js";
import { waitForJob } from "../queue/ai-job-store.js";
import { runLifeSkillsAiGenerate, runPhonicsLoadMoreWords } from "./domain-ai/life-skills-runners.js";
import { runSmartMathTricksAiGenerate } from "./domain-ai/smart-math-tricks-runners.js";
import { runSmartStudyNextQuestions } from "./domain-ai/smart-study-runners.js";
import { runOlympiadNextQuestions } from "./domain-ai/olympiad-runners.js";
import { runSpellingAiGenerate } from "./domain-ai/spelling-runners.js";
import {
  levelForAge,
  normalizeStudyCountry,
  type Level,
  type SmartSubjectId,
} from "@workspace/study-zone";
import { aiQuestionsToOlympiad } from "@workspace/olympiad";
import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadSubject,
} from "@workspace/olympiad";
import { ageBandForLifeSkills } from "@workspace/life-skills";
import { logger } from "../lib/logger.js";

export type LearningLoadMoreSection = AiContentNamespace;

export const LEARNING_LOAD_MORE_FEATURES: Record<
  LearningLoadMoreSection,
  FeatureKey
> = {
  smart_study: "learning_load_more_smart_study",
  smart_math_tricks: "learning_load_more_smart_math_tricks",
  olympiad: "learning_load_more_olympiad",
  spelling: "learning_load_more_spelling",
  phonics: "learning_load_more_phonics",
  life_skills: "learning_load_more_life_skills",
};

/** Free users: 1 lifetime AI load-more per section. Premium: 20/day per section. */
export const FREE_LOAD_MORE_LIFETIME = 1;
export const PREMIUM_LOAD_MORE_DAILY_CAP = 20;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageBucket(isPremium: boolean): string {
  return isPremium ? todayUtc() : "lifetime";
}

async function getLoadMoreUsage(
  userId: string,
  feature: FeatureKey,
  isPremium: boolean,
): Promise<number> {
  const day = usageBucket(isPremium);
  const rows = await db
    .select({ count: usageDailyTable.count })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, day),
        eq(usageDailyTable.feature, feature),
      ),
    )
    .limit(1);
  return rows[0]?.count ?? 0;
}

async function incrementLoadMoreUsage(
  userId: string,
  feature: FeatureKey,
  isPremium: boolean,
): Promise<number> {
  const day = usageBucket(isPremium);
  const result = await db
    .insert(usageDailyTable)
    .values({ userId, feature, day, count: 1 })
    .onConflictDoUpdate({
      target: [
        usageDailyTable.userId,
        usageDailyTable.day,
        usageDailyTable.feature,
      ],
      set: {
        count: sql`GREATEST(0, ${usageDailyTable.count} + 1)`,
        updatedAt: new Date(),
      },
    })
    .returning({ count: usageDailyTable.count });
  return result[0]?.count ?? 1;
}

export type LoadMoreUsageInfo = {
  isPremium: boolean;
  used: number;
  limit: number;
  remaining: number | null;
  charged: boolean;
};

export async function getLoadMoreUsageInfo(
  userId: string,
  section: LearningLoadMoreSection,
): Promise<LoadMoreUsageInfo> {
  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);
  const feature = LEARNING_LOAD_MORE_FEATURES[section];
  const used = await getLoadMoreUsage(userId, feature, isPremium);
  const limit = isPremium ? PREMIUM_LOAD_MORE_DAILY_CAP : FREE_LOAD_MORE_LIFETIME;
  return {
    isPremium,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    charged: false,
  };
}

async function reserveLoadMoreQuota(
  userId: string,
  section: LearningLoadMoreSection,
): Promise<
  | { ok: true; isPremium: boolean; feature: FeatureKey }
  | { ok: false; status: 402; message: string; feature: FeatureKey; limit: number; used: number }
> {
  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);
  const feature = LEARNING_LOAD_MORE_FEATURES[section];
  const used = await getLoadMoreUsage(userId, feature, isPremium);
  const limit = isPremium ? PREMIUM_LOAD_MORE_DAILY_CAP : FREE_LOAD_MORE_LIFETIME;

  if (used >= limit) {
    return {
      ok: false,
      status: 402,
      message: isPremium
        ? "Daily AI load-more limit reached. Try again tomorrow."
        : "Upgrade to generate more AI content.",
      feature,
      limit,
      used,
    };
  }

  await incrementLoadMoreUsage(userId, feature, isPremium);
  return { ok: true, isPremium, feature };
}

async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function resolveUserCountry(
  userId: string,
  override?: string,
): Promise<string> {
  if (override) return normalizeStudyCountry(override);
  const rows = await db
    .select({ country: parentProfilesTable.country })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);
  return normalizeStudyCountry(rows[0]?.country);
}

async function runAiJob<T>(
  type: string,
  routeName: string,
  userId: string,
  input: unknown,
  timeoutMs: number,
): Promise<T | null> {
  try {
    const enqueued = await enqueueAiJob(
      type as Parameters<typeof enqueueAiJob>[0],
      userId,
      wrapJobInput(routeName, input),
    );
    if (!enqueued.jobId) return null;
    const finished = isBullMqActive()
      ? await waitForJobResult(enqueued.jobId, timeoutMs)
      : await waitForJob(enqueued.jobId, timeoutMs);
    if (finished?.status !== "completed" || !finished.result) return null;
    return finished.result as T;
  } catch (err) {
    logger.warn(
      `learning load-more AI job failed (${type}): ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export type LoadMoreResult = {
  ok: true;
  section: LearningLoadMoreSection;
  source: "cache" | "ai";
  fromCache: boolean;
  charged: boolean;
  usage: LoadMoreUsageInfo;
  items: unknown;
};

export async function executeLearningLoadMore(opts: {
  userId: string;
  section: LearningLoadMoreSection;
  childId?: number;
  count?: number;
  excludeIds?: string[];
  params: Record<string, unknown>;
}): Promise<
  | LoadMoreResult
  | { ok: false; status: number; error: string; feature?: FeatureKey; limit?: number; used?: number }
> {
  const section = opts.section;
  const count = Math.min(Math.max(opts.count ?? 10, 1), 15);
  const excludeIds = new Set(opts.excludeIds ?? []);

  let lookupKey = "";
  let cachedItems: unknown[] = [];

  switch (section) {
    case "smart_study": {
      const subject = String(opts.params.subject ?? "");
      const level = Number(opts.params.level ?? 1);
      const country = String(opts.params.country ?? "US");
      lookupKey = buildAiContentLookupKey("smart_study", { level, subject, country });
      const hit = await fetchCachedItems<{
        id: string;
        q: string;
        options: string[];
        answer: string;
        hint?: string | null;
      }>({
        namespace: "smart_study",
        lookupKey,
        excludeIds,
        count,
        getId: (item) => item.id,
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { questions: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
    case "smart_math_tricks": {
      const age = String(opts.params.age ?? "4-6");
      lookupKey = buildAiContentLookupKey("smart_math_tricks", { age });
      const hit = await fetchCachedItems<{ id: string }>({
        namespace: "smart_math_tricks",
        lookupKey,
        excludeIds,
        count,
        getId: (item) => item.id,
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { tricks: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
    case "olympiad": {
      const ageBand = String(opts.params.ageBand ?? "6-8");
      const difficulty = String(opts.params.difficulty ?? "medium");
      const subject = String(opts.params.subject ?? "mixed");
      const country = String(opts.params.country ?? "US");
      lookupKey = buildAiContentLookupKey("olympiad", {
        ageBand,
        difficulty,
        subject,
        country,
      });
      const hit = await fetchCachedItems<{ id: string }>({
        namespace: "olympiad",
        lookupKey,
        excludeIds,
        count,
        getId: (item) => item.id,
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { questions: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
    case "spelling": {
      const age = String(opts.params.age ?? "4-6");
      const difficulty = String(opts.params.difficulty ?? "medium");
      lookupKey = buildAiContentLookupKey("spelling", { age, difficulty });
      const hit = await fetchCachedItems<{ id: string }>({
        namespace: "spelling",
        lookupKey,
        excludeIds,
        count,
        getId: (item) => item.id,
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { words: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
    case "phonics": {
      const level = Number(opts.params.level ?? 1);
      const vowel = String(opts.params.vowelFocus ?? "a");
      lookupKey = buildAiContentLookupKey("phonics", { level, vowel });
      const wordExclude = new Set([...excludeIds].map((x) => x.toLowerCase()));
      const hit = await fetchCachedItems<string>({
        namespace: "phonics",
        lookupKey,
        excludeIds: wordExclude,
        count,
        getId: (w) => (typeof w === "string" ? w : null),
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { words: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
    case "life_skills": {
      const ageBand = String(opts.params.ageBand ?? "kid");
      lookupKey = buildAiContentLookupKey("life_skills", { ageBand });
      const hit = await fetchCachedItems<{ id: string }>({
        namespace: "life_skills",
        lookupKey,
        excludeIds,
        count,
        getId: (item) => item.id,
      });
      if (hit.items.length >= count) {
        const usage = await getLoadMoreUsageInfo(opts.userId, section);
        return {
          ok: true,
          section,
          source: "cache",
          fromCache: true,
          charged: false,
          usage,
          items: { tasks: hit.items },
        };
      }
      cachedItems = hit.items;
      break;
    }
  }

  const need = count - cachedItems.length;
  const quota = await reserveLoadMoreQuota(opts.userId, section);
  if (!quota.ok) {
    if (cachedItems.length > 0) {
      const usage = await getLoadMoreUsageInfo(opts.userId, section);
      const partialKey =
        section === "smart_study" || section === "olympiad"
          ? "questions"
          : section === "smart_math_tricks"
            ? "tricks"
            : section === "spelling" || section === "phonics"
              ? "words"
              : "tasks";
      return {
        ok: true,
        section,
        source: "cache",
        fromCache: true,
        charged: false,
        usage,
        items: { [partialKey]: cachedItems },
      };
    }
    return {
      ok: false,
      status: 402,
      error: "feature_locked",
      feature: quota.feature,
      limit: quota.limit,
      used: quota.used,
    };
  }

  let freshItems: unknown[] = [];
  let itemsPayload: unknown = null;

  try {
    switch (section) {
      case "smart_study": {
        if (!opts.childId) {
          return { ok: false, status: 400, error: "childId_required" };
        }
        const child = await loadOwnedChild(opts.childId, opts.userId);
        if (!child) return { ok: false, status: 404, error: "child_not_found" };
        const subject = String(opts.params.subject ?? "") as SmartSubjectId;
        const level = (Number(opts.params.level ?? levelForAge(child.age ?? 0)) ||
          1) as Level;
        const country = await resolveUserCountry(
          opts.userId,
          opts.params.country as string | undefined,
        );
        lookupKey = buildAiContentLookupKey("smart_study", {
          level,
          subject,
          country,
        });

        const result =
          (await runAiJob<{ questions: unknown[] }>(
            "smart-study.next_questions",
            "learning-load-more/smart-study",
            opts.userId,
            {
              level,
              subject,
              country,
              ageYears: child.age ?? 0,
              count: need,
              excludeIds: [...excludeIds],
            },
            8000,
          )) ??
          (await runSmartStudyNextQuestions({
            level,
            subject,
            country,
            ageYears: child.age ?? 0,
            count: need,
            excludeIds: [...excludeIds],
          }));

        freshItems = (result?.questions ?? []) as unknown[];
        itemsPayload = {
          questions: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
      case "smart_math_tricks": {
        const age = String(opts.params.age ?? "4-6") as "4-6" | "6-8";
        lookupKey = buildAiContentLookupKey("smart_math_tricks", { age });

        const result = await runSmartMathTricksAiGenerate({
          age,
          count: need,
          excludeIds: [...excludeIds],
        });
        freshItems = result?.tricks ?? [];
        itemsPayload = {
          tricks: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
      case "olympiad": {
        if (!opts.childId) {
          return { ok: false, status: 400, error: "childId_required" };
        }
        const child = await loadOwnedChild(opts.childId, opts.userId);
        if (!child) return { ok: false, status: 404, error: "child_not_found" };
        const ageBand = String(opts.params.ageBand ?? "6-8") as OlympiadAgeBand;
        const difficulty = String(
          opts.params.difficulty ?? "medium",
        ) as OlympiadDifficulty;
        const subject = (opts.params.subject ?? "mixed") as
          | OlympiadSubject
          | "mixed";
        const country = await resolveUserCountry(
          opts.userId,
          opts.params.country as string | undefined,
        );
        lookupKey = buildAiContentLookupKey("olympiad", {
          ageBand,
          difficulty,
          subject,
          country,
        });

        const aiRaw =
          (await runAiJob<{ questions: unknown[] }>(
            "olympiad.next_questions",
            "learning-load-more/olympiad",
            opts.userId,
            {
              ageBand,
              difficulty,
              subject,
              country,
              ageYears: child.age ?? 8,
              count: need,
              excludeIds: [...excludeIds],
            },
            8000,
          )) ??
          (await runOlympiadNextQuestions({
            ageBand,
            difficulty,
            subject,
            country,
            ageYears: child.age ?? 8,
            count: need,
            excludeIds: [...excludeIds],
          }));

        const mapped = (aiRaw?.questions ?? []).flatMap((row, i) => {
          const r = row as {
            subject: OlympiadSubject;
            question: string;
            options: string[];
            answer: string;
            explanation?: string;
          };
          return aiQuestionsToOlympiad(
            [r],
            r.subject ?? "math",
            ageBand,
            difficulty,
            country,
            `loadmore-${opts.childId}-${Date.now()}-${i}`,
          );
        });
        freshItems = mapped;
        itemsPayload = {
          questions: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
      case "spelling": {
        const age = String(opts.params.age ?? "4-6") as
          | "2-4"
          | "4-6"
          | "6-8"
          | "8-10+";
        const difficulty = String(opts.params.difficulty ?? "medium") as
          | "easy"
          | "medium"
          | "hard";
        lookupKey = buildAiContentLookupKey("spelling", { age, difficulty });

        const result =
          (await runAiJob<{ words: unknown[] }>(
            "spelling.ai_generate",
            "learning-load-more/spelling",
            opts.userId,
            { age, difficulty, count: need },
            25_000,
          )) ?? (await runSpellingAiGenerate({ age, difficulty, count: need }));

        freshItems = result?.words ?? [];
        itemsPayload = {
          words: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
      case "phonics": {
        const level = Math.max(1, Math.min(6, Number(opts.params.level ?? 1)));
        const vowelFocus = String(opts.params.vowelFocus ?? "a").toLowerCase();
        lookupKey = buildAiContentLookupKey("phonics", {
          level,
          vowel: vowelFocus,
        });
        const excludeWords = [...excludeIds].map((w) => w.toLowerCase());
        for (const w of cachedItems) {
          if (typeof w === "string") excludeWords.push(w);
        }

        const result = await runPhonicsLoadMoreWords({
          level,
          vowelFocus,
          count: need,
          excludeWords,
        });
        freshItems = result?.words ?? [];
        itemsPayload = {
          words: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
      case "life_skills": {
        if (!opts.childId) {
          return { ok: false, status: 400, error: "childId_required" };
        }
        const child = await loadOwnedChild(opts.childId, opts.userId);
        if (!child) return { ok: false, status: 404, error: "child_not_found" };
        const ageBand =
          (opts.params.ageBand as string | undefined) ??
          ageBandForLifeSkills(child.age);
        lookupKey = buildAiContentLookupKey("life_skills", { ageBand });

        const result = await runLifeSkillsAiGenerate({
          ageBand: ageBand as Parameters<
            typeof runLifeSkillsAiGenerate
          >[0]["ageBand"],
          count: need,
          excludeIds: [...excludeIds],
        });
        freshItems = result?.tasks ?? [];
        itemsPayload = {
          tasks: [...cachedItems, ...freshItems].slice(0, count),
        };
        break;
      }
    }
  } catch (err) {
    logger.error(
      `learning load-more generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ok: false, status: 502, error: "ai_failed" };
  }

  const allNew = freshItems.filter(Boolean);
  if (allNew.length === 0) {
    return { ok: false, status: 502, error: "ai_empty" };
  }

  await saveCachedItems({
    namespace: section,
    lookupKey,
    items: allNew,
    source: "ai",
  });

  const usage = await getLoadMoreUsageInfo(opts.userId, section);
  usage.charged = true;

  return {
    ok: true,
    section,
    source: "ai",
    fromCache: cachedItems.length > 0,
    charged: true,
    usage,
    items: itemsPayload,
  };
}
