import { eq, and } from "drizzle-orm";
import {
  db,
  parentHubJourneyTable,
  childrenTable,
  lifeSkillsProgressTable,
  phonicsProgressTable,
  type ParentHubJourney,
} from "@workspace/db";
import {
  buildDefaultSummaryLine,
  buildPeekAhead,
  buildTodaysPath,
  bonusUnlockForDay,
  computeHubJourneyAccess,
  formatDateIso,
  normaliseCompletedDays,
  HUB_JOURNEY_FREE_DAYS,
  type ChildProgressSnapshot,
  type HubJourneyAccess,
  type PathStep,
  type PeekAheadItem,
} from "@workspace/parent-hub-journey";
import {
  ageBandForLifeSkills,
  pickDailyLifeSkillTasks,
  computeLifeSkillStreak,
  formatLifeSkillDate,
  L,
} from "@workspace/life-skills";
import { getArticlesForAgeMonths } from "@workspace/parenting-articles";
import { getOrCreateSubscription, isPremiumNow } from "./subscriptionService.js";
import { logger } from "../lib/logger.js";
import { withApiDomainMetrics } from "../lib/api-domain-metrics.js";

export {
  HUB_JOURNEY_FREE_DAYS,
  HUB_JOURNEY_EXEMPT_FEATURES,
  isHubJourneyFeatureLocked,
} from "@workspace/parent-hub-journey";

const PARENT_TIPS_BY_BAND: Record<string, string[]> = {
  infant: [
    "Respond to cries within a minute — it builds deep trust.",
    "Talk to your baby constantly — narrate what you're doing.",
    "Dim lights 30 minutes before bedtime to signal sleep time.",
  ],
  toddler: [
    "Offer two choices instead of commands — it reduces tantrums.",
    "Praise effort, not just results — builds resilience.",
    "Keep transitions predictable with a 2-minute warning.",
  ],
  preschool: [
    "Read together 10 minutes daily — the #1 school-ready habit.",
    "Let them help with small chores — it builds responsibility.",
    "Validate feelings before fixing problems.",
  ],
  school: [
    "Ask 'what was the best part of your day?' instead of 'how was school?'",
    "Protect a daily unplugged family window — even 20 minutes.",
    "Celebrate consistency over perfection in homework.",
  ],
};

const LEARNING_BY_BAND: Record<
  string,
  Array<{ emoji: string; title: string; body: string; href?: string }>
> = {
  infant: [
    { emoji: "👶", title: "Sensory moment", body: "5 minutes of peek-a-boo or mirror play." },
    { emoji: "📖", title: "Board book time", body: "Read one board book aloud together." },
  ],
  toddler: [
    { emoji: "🧩", title: "Daily puzzle", body: "Try today's age-matched brain teaser.", href: "/parenting-hub#hub-group-creativity" },
    { emoji: "✨", title: "Amazing fact", body: "Share one fun fact and ask what they think." },
  ],
  preschool: [
    { emoji: "🧩", title: "Daily puzzle", body: "Complete today's puzzle together.", href: "/parenting-hub#hub-group-creativity" },
    { emoji: "📖", title: "Story time", body: "Pick today's story from Story Hub.", href: "/parenting-hub#hub-group-stories" },
  ],
  school: [
    { emoji: "🏆", title: "Olympiad Daily 5", body: "5 quick quiz questions — great warm-up.", href: "/olympiad" },
    { emoji: "🔤", title: "Phonics / Spelling", body: "10 minutes of reading or spelling practice.", href: "/phonics" },
  ],
};

function ageBandKey(ageYears: number, ageMonths: number): string {
  const total = ageYears * 12 + ageMonths;
  if (total < 24) return "infant";
  if (total < 48) return "toddler";
  if (total < 72) return "preschool";
  return "school";
}

function hashPick<T>(pool: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i) | 0;
  return pool[Math.abs(h) % pool.length]!;
}

async function loadOwnedChild(userId: string, childId: number) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function userHasChild(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .limit(1);
  return !!row;
}

async function syncHubJourneyChildId(
  row: ParentHubJourney,
  childId: number,
): Promise<ParentHubJourney> {
  if (row.childId === childId) return row;
  const now = new Date();
  try {
    const [updated] = await db
      .update(parentHubJourneyTable)
      .set({ childId, updatedAt: now })
      .where(eq(parentHubJourneyTable.userId, row.userId))
      .returning();
    return updated ?? { ...row, childId, updatedAt: now };
  } catch (err) {
    logger.warn(
      { err, evt: "hub_journey.child_sync_failed", userId: row.userId, childId },
      "hub journey childId sync failed — continuing with cached row",
    );
    return { ...row, childId, updatedAt: now };
  }
}

async function resolvePremiumForHub(userId: string): Promise<boolean> {
  try {
    const sub = await getOrCreateSubscription(userId);
    return isPremiumNow(sub);
  } catch (err) {
    logger.warn(
      { err, evt: "hub_journey.premium_check_failed", userId },
      "hub journey premium check failed — defaulting to free",
    );
    return false;
  }
}

function emptyProgressSnapshot(childName: string): ChildProgressSnapshot {
  return {
    lifeSkillsDone: 0,
    lifeSkillsStreak: 0,
    consistencyDays: 0,
    levelLabel: null,
    summaryLine: buildDefaultSummaryLine(childName, {
      lifeSkillsDone: 0,
      lifeSkillsStreak: 0,
      consistencyDays: 0,
      levelLabel: null,
    }),
  };
}

function asStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

export async function ensureHubJourney(
  userId: string,
  childId?: number,
): Promise<ParentHubJourney | null> {
  const [existing] = await db
    .select()
    .from(parentHubJourneyTable)
    .where(eq(parentHubJourneyTable.userId, userId))
    .limit(1);
  if (existing) {
    return childId != null ? syncHubJourneyChildId(existing, childId) : existing;
  }
  if (!(await userHasChild(userId))) return null;

  const [created] = await db
    .insert(parentHubJourneyTable)
    .values({ userId, childId: childId ?? null })
    .onConflictDoNothing({ target: parentHubJourneyTable.userId })
    .returning();

  if (created) {
    logger.info({ evt: "hub_journey.started", userId, childId }, "Parent Hub journey started");
    return created;
  }

  const [retry] = await db
    .select()
    .from(parentHubJourneyTable)
    .where(eq(parentHubJourneyTable.userId, userId))
    .limit(1);
  if (!retry) return null;
  return childId != null ? syncHubJourneyChildId(retry, childId) : retry;
}

async function loadProgressSnapshot(
  userId: string,
  childId: number,
  childName: string,
  ageYears: number,
): Promise<ChildProgressSnapshot> {
  try {
  const lsRows = await db
    .select({ completedDates: lifeSkillsProgressTable.completedDates })
    .from(lifeSkillsProgressTable)
    .where(
      and(
        eq(lifeSkillsProgressTable.userId, userId),
        eq(lifeSkillsProgressTable.childId, childId),
      ),
    );

  const allDates: string[] = [];
  let lifeSkillsDone = 0;
  for (const r of lsRows) {
    if (Array.isArray(r.completedDates)) {
      lifeSkillsDone += r.completedDates.length;
      allDates.push(...r.completedDates);
    }
  }
  const streak = computeLifeSkillStreak(allDates);

  const phRows = await db
    .select({ mastered: phonicsProgressTable.mastered })
    .from(phonicsProgressTable)
    .where(
      and(
        eq(phonicsProgressTable.userId, userId),
        eq(phonicsProgressTable.childId, childId),
      ),
    );
  let phonicsMastered = 0;
  for (const r of phRows) {
    if (r.mastered) phonicsMastered++;
  }

  const weekSet = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = formatDateIso(d);
    if (allDates.includes(key)) weekSet.add(key);
  }

  let levelLabel: string | null = null;
  if (phonicsMastered >= 5) levelLabel = `Phonics: ${phonicsMastered} sounds mastered`;
  else if (lifeSkillsDone >= 3) levelLabel = "Life Skills Level 2";
  else if (lifeSkillsDone >= 1) levelLabel = "Life Skills Level 1";

  const summaryLine = buildDefaultSummaryLine(childName, {
    lifeSkillsDone,
    lifeSkillsStreak: streak.current,
    consistencyDays: weekSet.size,
    levelLabel,
  });

  return {
    lifeSkillsDone,
    lifeSkillsStreak: streak.current,
    consistencyDays: weekSet.size,
    levelLabel,
    summaryLine,
  };
  } catch (err) {
    logger.warn(
      { err, evt: "hub_journey.progress_snapshot_failed", userId, childId },
      "hub journey progress snapshot failed — using empty snapshot",
    );
    return emptyProgressSnapshot(childName);
  }
}

function pickParentTip(band: string, journeyDay: number, dateIso: string): string {
  const pool = PARENT_TIPS_BY_BAND[band] ?? PARENT_TIPS_BY_BAND.school!;
  return hashPick(pool, `${dateIso}:${band}:${journeyDay}:tip`);
}

function pickLearning(band: string, journeyDay: number, dateIso: string, childId: number) {
  const pool = LEARNING_BY_BAND[band] ?? LEARNING_BY_BAND.school!;
  return hashPick(pool, `${dateIso}:${band}:${journeyDay}:learn:${childId}`);
}

export interface HubJourneyStatusResponse {
  access: HubJourneyAccess;
  journeyDay: number;
  pathSteps: PathStep[];
  pathCompleted: boolean;
  peekAhead: PeekAheadItem[];
  peekAvailable: boolean;
  progress: ChildProgressSnapshot;
  bonusUnlocks: string[];
  articleOfDay: { id: string; title: string; summary: string } | null;
  child: { id: number; name: string; age: number; ageMonths: number };
}

export async function getHubJourneyStatus(
  userId: string,
  childId: number,
): Promise<HubJourneyStatusResponse | null> {
  return withApiDomainMetrics("hub_journey", async () => {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return null;

  const premium = await resolvePremiumForHub(userId);
  const row = await ensureHubJourney(userId, childId);
  if (!row) return null;

  const completedDays = normaliseCompletedDays(row.completedDays);
  const access = computeHubJourneyAccess({
    isPremium: premium,
    completedDays,
    startedAt: row.startedAt,
  });

  const journeyDay = premium
    ? Math.min(completedDays.length + 1, HUB_JOURNEY_FREE_DAYS)
    : access.currentDay;

  const dateIso = formatDateIso();
  const ageMonths = child.ageMonths ?? 0;
  const totalMonths = child.age * 12 + ageMonths;
  const band = ageBandKey(child.age, ageMonths);

  const yKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLifeSkillDate(d);
  })();
  const previousIds: string[] = [];
  if (child.age >= 2) {
    try {
    const lsRows = await db
      .select({ skillId: lifeSkillsProgressTable.skillId, completedDates: lifeSkillsProgressTable.completedDates })
      .from(lifeSkillsProgressTable)
      .where(and(eq(lifeSkillsProgressTable.userId, userId), eq(lifeSkillsProgressTable.childId, childId)));
    for (const r of lsRows) {
      if (Array.isArray(r.completedDates) && r.completedDates.includes(yKey)) {
        previousIds.push(r.skillId);
      }
    }
    } catch (err) {
      logger.warn(
        { err, evt: "hub_journey.life_skills_read_failed", userId, childId },
        "hub journey life skills read failed — continuing without previousIds",
      );
    }
  }

  let lifeSkillTasks: ReturnType<typeof pickDailyLifeSkillTasks> = [];
  if (child.age >= 2) {
    try {
      lifeSkillTasks = pickDailyLifeSkillTasks({
        ageBand: ageBandForLifeSkills(child.age),
        date: dateIso,
        childKey: childId,
        count: 1,
        previousIds,
      });
    } catch (err) {
      logger.warn(
        { err, evt: "hub_journey.life_skill_pick_failed", userId, childId },
        "hub journey daily life skill pick failed",
      );
    }
  }
  const ls = lifeSkillTasks[0];

  let article: { id: string; title: string; summary: string } | null = null;
  try {
    const articles = getArticlesForAgeMonths(totalMonths);
    const articleIdx = Math.abs(
      `${dateIso}:${childId}`.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
    ) % Math.max(1, articles.length);
    article = articles[articleIdx] ?? null;
  } catch (err) {
    logger.warn(
      { err, evt: "hub_journey.article_pick_failed", userId, childId },
      "hub journey article pick failed",
    );
  }

  const progress = await loadProgressSnapshot(userId, childId, child.name, child.age);

  if (band === "infant") {
    progress.consistencyDays = Math.max(progress.consistencyDays, completedDays.length);
  }

  const pathSteps = buildTodaysPath({
    journeyDay,
    dateIso,
    childId,
    childName: child.name,
    ageYears: child.age,
    ageMonths,
    parentTip: pickParentTip(band, journeyDay, dateIso),
    lifeSkill: ls
      ? { id: ls.id, title: L(ls.title, "en"), body: L(ls.description, "en") }
      : null,
    learning: pickLearning(band, journeyDay, dateIso, childId),
    article: article ? { title: article.title, summary: article.summary } : null,
    summaryLine: progress.summaryLine,
  });

  const pathCompleted = completedDays.includes(journeyDay);
  const peekUsed = normaliseCompletedDays(row.peekAheadUsed);
  const peekAvailable =
    !premium &&
    access.isFreePeriod &&
    !peekUsed.includes(journeyDay) &&
    journeyDay < HUB_JOURNEY_FREE_DAYS;

  const isInfant = totalMonths < 24;

  const peekAhead = buildPeekAhead({
    nextJourneyDay: journeyDay + 1,
    dateIso,
    childName: child.name,
    childKey: childId,
    isInfant,
  });

  return {
    access,
    journeyDay,
    pathSteps,
    pathCompleted,
    peekAhead,
    peekAvailable,
    progress,
    bonusUnlocks: asStringArray(row.bonusUnlocks),
    articleOfDay: article
      ? { id: article.id, title: article.title, summary: article.summary }
      : null,
    child: {
      id: child.id,
      name: child.name,
      age: child.age,
      ageMonths,
    },
  };
  });
}

export async function completeHubJourneyPath(
  userId: string,
  childId: number,
  stepIds: string[],
): Promise<{ ok: boolean; dayCompleted?: number; journeyFinished?: boolean; access?: HubJourneyAccess }> {
  const status = await getHubJourneyStatus(userId, childId);
  if (!status) return { ok: false };

  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) return { ok: true, access: status.access };

  const row = await ensureHubJourney(userId, childId);
  if (!row) return { ok: false };

  const completedDays = normaliseCompletedDays(row.completedDays);
  const journeyDay = status.journeyDay;

  if (completedDays.includes(journeyDay)) {
    return { ok: true, access: status.access };
  }

  const expectedIds = new Set(status.pathSteps.map((s) => s.id));
  const provided = stepIds.filter((id) => expectedIds.has(id));
  if (provided.length < expectedIds.size) {
    return { ok: false };
  }

  const now = new Date();
  const nextCompleted = [...completedDays, journeyDay].sort((a, b) => a - b);
  const journeyFinished = nextCompleted.length >= HUB_JOURNEY_FREE_DAYS;
  const childForBonus = await loadOwnedChild(userId, childId);
  const bonusMonths = childForBonus
    ? childForBonus.age * 12 + (childForBonus.ageMonths ?? 0)
    : 999;
  const bonus = bonusUnlockForDay(journeyDay, {
    isInfant: bonusMonths < 24,
  });
  const bonusUnlocks = [...(row.bonusUnlocks ?? [])];
  if (bonus && !bonusUnlocks.includes(bonus)) bonusUnlocks.push(bonus);

  await db
    .update(parentHubJourneyTable)
    .set({
      childId,
      completedDays: nextCompleted,
      currentDay: journeyFinished ? HUB_JOURNEY_FREE_DAYS + 1 : journeyDay + 1,
      dayCompletedAt: {
        ...(typeof row.dayCompletedAt === "object" && row.dayCompletedAt ? row.dayCompletedAt : {}),
        [String(journeyDay)]: now.toISOString(),
      },
      bonusUnlocks,
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(parentHubJourneyTable.userId, userId));

  logger.info(
    {
      evt: journeyFinished ? "hub_journey.finished" : "hub_journey.day_complete",
      userId,
      day: journeyDay,
    },
    journeyFinished ? "Hub journey free period finished" : "Hub journey day complete",
  );

  const access = computeHubJourneyAccess({
    isPremium: false,
    completedDays: nextCompleted,
    startedAt: row.startedAt,
  });

  return { ok: true, dayCompleted: journeyDay, journeyFinished, access };
}

export async function useHubJourneyPeekAhead(
  userId: string,
  childId: number,
): Promise<{ ok: boolean; peekAhead?: PeekAheadItem[] }> {
  const status = await getHubJourneyStatus(userId, childId);
  if (!status?.peekAvailable) return { ok: false };

  const row = await ensureHubJourney(userId, childId);
  if (!row) return { ok: false };

  const peekUsed = normaliseCompletedDays(row.peekAheadUsed);
  if (peekUsed.includes(status.journeyDay)) return { ok: false };

  const nextPeek = [...peekUsed, status.journeyDay];
  await db
    .update(parentHubJourneyTable)
    .set({ peekAheadUsed: nextPeek, updatedAt: new Date() })
    .where(eq(parentHubJourneyTable.userId, userId));

  const unlocked = status.peekAhead.map((p) => ({ ...p, locked: false }));
  return { ok: true, peekAhead: unlocked };
}
