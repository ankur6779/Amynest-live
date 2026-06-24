import { createHmac } from "node:crypto";
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
import { wrapJobInput, unwrapJobPayload } from "../queue/ai-job-payload.js";
import type { AiJobType, AiJobRecord } from "../queue/types.js";
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
import { assertLearningZoneEnglishItems } from "../lib/learning-zone-english.js";

export type LearningLoadMoreSection = AiContentNamespace;

function answerSecret(): string {
  return process.env["SMART_STUDY_ANSWER_SECRET"]
    ?? process.env["SESSION_SECRET"]
    ?? "amynest-smart-study-dev-secret";
}

function smartStudyAnswerMac(questionId: string, answer: string): string {
  return createHmac("sha256", answerSecret())
    .update(`${questionId}:${answer.trim().toLowerCase()}`)
    .digest("base64url");
}

function smartStudyAnswerToken(opts: {
  userId: string;
  childId: number;
  subject: string;
  questionId: string;
  answer: string;
}): string {
  const body = Buffer.from(
    JSON.stringify({
      userId: opts.userId,
      childId: opts.childId,
      subject: opts.subject,
      questionId: opts.questionId,
      answerMac: smartStudyAnswerMac(opts.questionId, opts.answer),
      issuedAt: Date.now(),
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", answerSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function sanitizeSmartStudyQuestions(
  questions: Array<{ id: string; q: string; options: string[]; answer?: string; hint?: string | null }>,
  opts: { userId: string; childId?: number; subject: string },
) {
  if (opts.childId == null) return [];
  return questions
    .filter((q) => typeof q.answer === "string")
    .map((q) => ({
      id: q.id,
      q: q.q,
      options: q.options,
      answerToken: smartStudyAnswerToken({
        userId: opts.userId,
        childId: opts.childId!,
        subject: opts.subject,
        questionId: q.id,
        answer: q.answer!,
      }),
    }));
}

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

/** Refund one load-more quota unit when a reserved AI job does not succeed. */
export async function refundLoadMoreQuota(
  userId: string,
  section: LearningLoadMoreSection,
): Promise<void> {
  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);
  const feature = LEARNING_LOAD_MORE_FEATURES[section];
  const day = usageBucket(isPremium);
  await db
    .update(usageDailyTable)
    .set({
      count: sql`GREATEST(0, ${usageDailyTable.count} - 1)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, day),
        eq(usageDailyTable.feature, feature),
      ),
    );
}

export async function refundLoadMoreQuotaFromJob(job: AiJobRecord): Promise<void> {
  const { routeName, pollContext } = unwrapJobPayload(job.payload);
  if (!routeName.startsWith("learning-load-more/")) return;
  const ctx = pollContext as LoadMorePollContext | undefined;
  if (!ctx?.userId || !ctx?.section) return;
  await refundLoadMoreQuota(ctx.userId, ctx.section);
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

async function enqueueLoadMoreJob(
  type: AiJobType,
  routeName: string,
  userId: string,
  input: unknown,
  pollContext: LoadMorePollContext,
): Promise<string | null> {
  try {
    const enqueued = await enqueueAiJob(type, userId, wrapJobInput(routeName, input, pollContext));
    if (!enqueued.jobId) {
      logger.error(
        { evt: "learning_load_more.enqueue_failed", type, routeName, userId },
        "learning load-more enqueue failed",
      );
      return null;
    }
    return enqueued.jobId;
  } catch (err) {
    logger.warn(
      `learning load-more enqueue failed (${type}): ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export type LoadMorePollContext = {
  userId: string;
  section: LearningLoadMoreSection;
  lookupKey: string;
  cachedItems: unknown[];
  count: number;
  childId?: number;
  smartStudySubject?: string;
  olympiad?: {
    ageBand: OlympiadAgeBand;
    difficulty: OlympiadDifficulty;
    subject: OlympiadSubject | "mixed";
    country: string;
  };
};

function loadMoreItemsPayload(
  section: LearningLoadMoreSection,
  items: unknown[],
  ctx: Pick<LoadMorePollContext, "userId" | "childId" | "smartStudySubject">,
): Record<string, unknown> {
  if (section === "smart_study") {
    return {
      questions: sanitizeSmartStudyQuestions(
        items as Array<{ id: string; q: string; options: string[]; answer?: string; hint?: string | null }>,
        {
          userId: ctx.userId,
          childId: ctx.childId,
          subject: ctx.smartStudySubject ?? "",
        },
      ),
    };
  }
  return { [itemsKeyForSection(section)]: items };
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

export type LoadMoreProcessingResult = {
  ok: false;
  status: "processing";
  jobId: string;
  pollUrl: string;
  section: LearningLoadMoreSection;
};

function itemsKeyForSection(section: LearningLoadMoreSection): string {
  if (section === "smart_study" || section === "olympiad") return "questions";
  if (section === "smart_math_tricks") return "tricks";
  if (section === "spelling" || section === "phonics") return "words";
  return "tasks";
}

function extractFreshItems(
  section: LearningLoadMoreSection,
  raw: unknown,
  ctx: LoadMorePollContext,
): unknown[] {
  const body = raw as Record<string, unknown>;
  switch (section) {
    case "smart_study":
      return (body.questions as unknown[]) ?? [];
    case "smart_math_tricks":
      return (body.tricks as unknown[]) ?? [];
    case "spelling":
    case "phonics":
      return (body.words as unknown[]) ?? [];
    case "life_skills":
      return (body.tasks as unknown[]) ?? [];
    case "olympiad": {
      const aiRaw = (body.questions as unknown[]) ?? [];
      const o = ctx.olympiad;
      if (!o) return [];
      return aiRaw.flatMap((row, i) => {
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
          o.ageBand,
          o.difficulty,
          o.country,
          `loadmore-${ctx.childId ?? 0}-${Date.now()}-${i}`,
        );
      });
    }
    default:
      return [];
  }
}

/** Poll finalize — merge worker output with cache, persist, return API shape. */
export async function finalizeLearningLoadMorePoll(
  rawResult: unknown,
  pollContext: unknown,
  opts?: { skipSideEffects?: boolean },
): Promise<LoadMoreResult | { ok: false; error: string }> {
  const skipSideEffects = opts?.skipSideEffects === true;
  const ctx = pollContext as LoadMorePollContext;
  const section = ctx.section;
  const freshItems = extractFreshItems(section, rawResult, ctx).filter(Boolean);
  const count = ctx.count;
  const cachedItems = ctx.cachedItems ?? [];
  const mergedItems = [...cachedItems, ...freshItems].slice(0, count);
  const itemsPayload = loadMoreItemsPayload(section, mergedItems, ctx);

  if (freshItems.length === 0) {
    if (!skipSideEffects) {
      await refundLoadMoreQuota(ctx.userId, section);
    }
    return { ok: false, error: "ai_empty" };
  }

  if (!assertLearningZoneEnglishItems(itemsPayload)) {
    logger.warn(`learning load-more rejected non-English payload for ${section}`);
    if (cachedItems.length > 0) {
      if (!skipSideEffects) {
        await refundLoadMoreQuota(ctx.userId, section);
      }
      const usage = await getLoadMoreUsageInfo(ctx.userId, section);
      return {
        ok: true,
        section,
        source: "cache",
        fromCache: true,
        charged: false,
        usage,
        items: loadMoreItemsPayload(section, cachedItems, ctx),
      };
    }
    if (!skipSideEffects) {
      await refundLoadMoreQuota(ctx.userId, section);
    }
    return { ok: false, error: "ai_non_english" };
  }

  if (!skipSideEffects) {
    await saveCachedItems({
      namespace: section,
      lookupKey: ctx.lookupKey,
      items: freshItems,
      source: "ai",
    });
  }

  const usage = await getLoadMoreUsageInfo(ctx.userId, section);
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

export async function executeLearningLoadMore(opts: {
  userId: string;
  section: LearningLoadMoreSection;
  childId?: number;
  count?: number;
  excludeIds?: string[];
  params: Record<string, unknown>;
}): Promise<
  | LoadMoreResult
  | LoadMoreProcessingResult
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
          items: loadMoreItemsPayload(section, hit.items, {
            userId: opts.userId,
            childId: opts.childId,
            smartStudySubject: subject,
          }),
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
        items:
          section === "smart_study"
            ? loadMoreItemsPayload(section, cachedItems, {
                userId: opts.userId,
                childId: opts.childId,
                smartStudySubject: String(opts.params.subject ?? ""),
              })
            : { [partialKey]: cachedItems },
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

  const pollContextBase: Omit<LoadMorePollContext, "lookupKey"> = {
    userId: opts.userId,
    section,
    cachedItems,
    count,
    childId: opts.childId,
    smartStudySubject:
      section === "smart_study" ? String(opts.params.subject ?? "") : undefined,
  };

  let jobId: string | null = null;

  switch (section) {
    case "smart_study": {
      if (!opts.childId) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 400, error: "childId_required" };
      }
      const child = await loadOwnedChild(opts.childId, opts.userId);
      if (!child) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 404, error: "child_not_found" };
      }
      const subject = String(opts.params.subject ?? "") as SmartSubjectId;
      const level = (Number(opts.params.level ?? levelForAge(child.age ?? 0)) || 1) as Level;
      const country = await resolveUserCountry(
        opts.userId,
        opts.params.country as string | undefined,
      );
      lookupKey = buildAiContentLookupKey("smart_study", { level, subject, country });
      jobId = await enqueueLoadMoreJob(
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
        { ...pollContextBase, lookupKey },
      );
      break;
    }
    case "smart_math_tricks": {
      const age = String(opts.params.age ?? "4-6") as "4-6" | "6-8";
      lookupKey = buildAiContentLookupKey("smart_math_tricks", { age });
      jobId = await enqueueLoadMoreJob(
        "smart-math-tricks.ai_generate",
        "learning-load-more/smart-math-tricks",
        opts.userId,
        { age, count: need, excludeIds: [...excludeIds] },
        { ...pollContextBase, lookupKey },
      );
      break;
    }
    case "olympiad": {
      if (!opts.childId) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 400, error: "childId_required" };
      }
      const child = await loadOwnedChild(opts.childId, opts.userId);
      if (!child) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 404, error: "child_not_found" };
      }
      const ageBand = String(opts.params.ageBand ?? "6-8") as OlympiadAgeBand;
      const difficulty = String(opts.params.difficulty ?? "medium") as OlympiadDifficulty;
      const subject = (opts.params.subject ?? "mixed") as OlympiadSubject | "mixed";
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
      jobId = await enqueueLoadMoreJob(
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
        {
          ...pollContextBase,
          lookupKey,
          olympiad: { ageBand, difficulty, subject, country },
        },
      );
      break;
    }
    case "spelling": {
      const age = String(opts.params.age ?? "4-6") as "2-4" | "4-6" | "6-8" | "8-10+";
      const difficulty = String(opts.params.difficulty ?? "medium") as
        | "easy"
        | "medium"
        | "hard";
      lookupKey = buildAiContentLookupKey("spelling", { age, difficulty });
      jobId = await enqueueLoadMoreJob(
        "spelling.ai_generate",
        "learning-load-more/spelling",
        opts.userId,
        { age, difficulty, count: need },
        { ...pollContextBase, lookupKey },
      );
      break;
    }
    case "phonics": {
      const level = Math.max(1, Math.min(6, Number(opts.params.level ?? 1)));
      const vowelFocus = String(opts.params.vowelFocus ?? "a").toLowerCase();
      lookupKey = buildAiContentLookupKey("phonics", { level, vowel: vowelFocus });
      const excludeWords = [...excludeIds].map((w) => w.toLowerCase());
      for (const w of cachedItems) {
        if (typeof w === "string") excludeWords.push(w);
      }
      jobId = await enqueueLoadMoreJob(
        "phonics.load_more_words",
        "learning-load-more/phonics",
        opts.userId,
        { level, vowelFocus, count: need, excludeWords },
        { ...pollContextBase, lookupKey },
      );
      break;
    }
    case "life_skills": {
      if (!opts.childId) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 400, error: "childId_required" };
      }
      const child = await loadOwnedChild(opts.childId, opts.userId);
      if (!child) {
        await refundLoadMoreQuota(opts.userId, section);
        return { ok: false, status: 404, error: "child_not_found" };
      }
      const ageBand =
        (opts.params.ageBand as string | undefined) ?? ageBandForLifeSkills(child.age);
      lookupKey = buildAiContentLookupKey("life_skills", { ageBand });
      jobId = await enqueueLoadMoreJob(
        "life-skills.ai_generate",
        "learning-load-more/life-skills",
        opts.userId,
        {
          ageBand,
          count: need,
          excludeIds: [...excludeIds],
        },
        { ...pollContextBase, lookupKey },
      );
      break;
    }
  }

  if (!jobId) {
    await refundLoadMoreQuota(opts.userId, section);
    return { ok: false, status: 503, error: "ai_queue_unavailable" };
  }

  return {
    ok: false,
    status: "processing",
    jobId,
    pollUrl: `/api/result/${jobId}`,
    section,
  };
}
