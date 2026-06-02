import { eq, and } from "drizzle-orm";
import {
  db,
  childrenTable,
  learningProgressTable,
} from "@workspace/db";
import {
  type ContentBankCategory,
  type ContentBankUnlockContext,
  type ContentBankManifest,
  ageBandFromChildAge,
  pickDailyFeed,
  filterUnlockedCatalog,
  isItemAccessible,
  contentBankActivityId,
} from "@workspace/content-bank";
import { enrichWithAudio } from "./contentBankAudio.js";
import {
  loadContentBankCategory,
  loadContentBankManifest,
  type SmartStudyLesson,
  type LifeSkillsLesson,
  type EventPrepActivity,
  type MathProgressionPack,
} from "./contentBankStore.js";

async function loadOwnedChild(userId: string, childId: number) {
  const [child] = await db
    .select({
      id: childrenTable.id,
      age: childrenTable.age,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return child ?? null;
}

async function loadUnlockContext(
  userId: string,
  childId: number,
  dateIso: string,
  isPremium = false,
): Promise<ContentBankUnlockContext | null> {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return null;

  const [progress] = await db
    .select()
    .from(learningProgressTable)
    .where(eq(learningProgressTable.childId, childId))
    .limit(1);

  const completed = Array.isArray(progress?.completedActivities)
    ? (progress.completedActivities as string[])
    : [];

  return {
    childAge: child.age,
    learningLevel: progress?.learningLevel ?? 1,
    masteryScore: progress?.masteryScore ?? 0,
    journeyDay: progress?.journeyDay ?? 1,
    completedActivityIds: completed,
    dateIso,
    childId,
    isPremium,
  };
}

export async function getContentBankManifestForApi(): Promise<ContentBankManifest> {
  return loadContentBankManifest();
}

export async function getContentBankStatus(
  userId: string,
  childId: number,
  dateIso: string,
  isPremium?: boolean,
) {
  const ctx = await loadUnlockContext(userId, childId, dateIso, isPremium);
  if (!ctx) return null;

  const manifest = await loadContentBankManifest();
  const categories: ContentBankCategory[] = [
    "smart-study",
    "life-skills",
    "event-prep",
    "math-progression",
  ];

  const counts: Record<string, { eligible: number; unlocked: number; ageBand: string }> = {};
  for (const cat of categories) {
    const items = await loadContentBankCategory(cat);
    const unlocked = filterUnlockedCatalog(cat, items, ctx);
    counts[cat] = {
      eligible: items.length,
      unlocked: unlocked.length,
      ageBand: ageBandFromChildAge(ctx.childAge),
    };
  }

  return {
    manifestVersion: manifest.version,
    generatedAt: manifest.generatedAt,
    childAgeBand: ageBandFromChildAge(ctx.childAge),
    learningLevel: ctx.learningLevel,
    masteryScore: ctx.masteryScore,
    categories: counts,
  };
}

export async function getContentBankFeed(
  userId: string,
  category: ContentBankCategory,
  childId: number,
  opts: { limit?: number; offset?: number; dateIso?: string; isPremium?: boolean },
) {
  const dateIso = opts.dateIso ?? new Date().toISOString().slice(0, 10);
  const ctx = await loadUnlockContext(userId, childId, dateIso, opts.isPremium);
  if (!ctx) return null;

  const manifest = await loadContentBankManifest();
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const offset = Math.max(0, opts.offset ?? 0);

  switch (category) {
    case "smart-study": {
      const items = await loadContentBankCategory<SmartStudyLesson>("smart-study");
      const feed = pickDailyFeed("smart-study", items, ctx, limit, offset);
      return {
        ...feed,
        items: enrichWithAudio("smart-study", feed.items),
        manifestVersion: manifest.version,
        category,
      };
    }
    case "life-skills": {
      const items = await loadContentBankCategory<LifeSkillsLesson>("life-skills");
      const feed = pickDailyFeed("life-skills", items, ctx, limit, offset);
      return {
        ...feed,
        items: enrichWithAudio("life-skills", feed.items),
        manifestVersion: manifest.version,
        category,
      };
    }
    case "event-prep": {
      const items = await loadContentBankCategory<EventPrepActivity>("event-prep");
      const feed = pickDailyFeed("event-prep", items, ctx, limit, offset);
      return {
        ...feed,
        items: enrichWithAudio("event-prep", feed.items),
        manifestVersion: manifest.version,
        category,
      };
    }
    case "math-progression": {
      const items = await loadContentBankCategory<MathProgressionPack>("math-progression");
      const feed = pickDailyFeed("math-progression", items, ctx, limit, offset);
      return {
        ...feed,
        items: enrichWithAudio("math-progression", feed.items),
        manifestVersion: manifest.version,
        category,
      };
    }
    default:
      return null;
  }
}

export async function getContentBankItem(
  userId: string,
  category: ContentBankCategory,
  itemId: string,
  childId: number,
  dateIso?: string,
  isPremium?: boolean,
) {
  const ctx = await loadUnlockContext(
    userId,
    childId,
    dateIso ?? new Date().toISOString().slice(0, 10),
    isPremium,
  );
  if (!ctx) return null;

  const items = await loadContentBankCategory(category);
  if (!isItemAccessible(category, items, itemId, ctx)) {
    return { error: "locked" as const };
  }
  const item = items.find((x) => x.id === itemId);
  if (!item) return { error: "not_found" as const };
  const manifest = await loadContentBankManifest();
  const enriched = enrichWithAudio(category, [
    { ...(item as unknown as Record<string, unknown>), id: itemId } as { id: string; audioText?: string },
  ])[0];

  return {
    item: enriched,
    category,
    manifestVersion: manifest.version,
    progressActivityId: contentBankActivityId(category, itemId),
  };
}
