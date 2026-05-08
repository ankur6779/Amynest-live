import { and, desc, eq, gte } from "drizzle-orm";
import {
  childrenTable,
  db,
  routinesTable,
  behaviorsTable,
  userProgressTable,
  type NotificationCategory,
} from "@workspace/db";
import {
  computeProductiveNudgesForChild,
  renderNudgeBodyForPush,
} from "./productiveNudges.js";

export interface BuiltNotification {
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  data?: Record<string, unknown>;
}

interface ChildSummary {
  id: number;
  name: string;
  age: number;
  ageMonths: number;
  foodType: string;
}

async function getPrimaryChild(userId: string): Promise<ChildSummary | null> {
  const [child] = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
      foodType: childrenTable.foodType,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(desc(childrenTable.createdAt))
    .limit(1);
  return child ?? null;
}

function ageGroup(age: number): "toddler" | "preschool" | "child" | "tween" {
  if (age < 3) return "toddler";
  if (age < 6) return "preschool";
  if (age < 10) return "child";
  return "tween";
}

function todayLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/* -----------------------------  Routine  ----------------------------- */

export async function buildMorningRoutine(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  const greetings: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: `Good morning! Time to get ${child.name}'s day started 🌅`,
    preschool: `Morning! ${child.name}'s routine is ready to start ☀️`,
    child: `Rise and shine — ${child.name}'s morning plan is waiting`,
    tween: `Good morning. Today's plan for ${child.name} is set.`,
  };
  return {
    title: greetings[ageGroup(child.age)],
    body: "Tap to see today's full routine and check off the first task.",
    deepLink: "/routine",
    dedupKey: `morning:${date}`,
    data: { childId: child.id },
  };
}

export async function buildSnackTime(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  const isVeg = child.foodType === "veg";
  const ideas = isVeg
    ? ["fruit chaat", "roasted makhana", "yogurt with berries", "boiled corn"]
    : ["boiled egg", "paneer cubes", "fruit chaat", "roasted chickpeas"];
  const pick = ideas[Math.floor(Math.random() * ideas.length)];
  return {
    title: "Snack time idea 🍎",
    body: `Try ${pick} for ${child.name} this afternoon.`,
    deepLink: "/meals",
    dedupKey: `snack:${date}`,
    data: { childId: child.id },
  };
}

export async function buildDinnerSuggestion(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  return {
    title: `Dinner ideas for ${child.name} 🍲`,
    body: "Need inspiration? See balanced dinners that match today's plan.",
    deepLink: "/meals",
    dedupKey: `dinner:${date}`,
    data: { childId: child.id },
  };
}

export async function buildGoodNight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  return {
    title: `Good night, ${child.name} 🌙`,
    body: "Wind down with a calm bedtime routine. Tap to log today's wins.",
    deepLink: "/hub",
    dedupKey: `goodnight:${date}`,
    data: { childId: child.id },
  };
}

/* -----------------------------  Weekly  ----------------------------- */

export async function buildWeeklyReport(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  const childName = child?.name ?? "your child";
  const date = todayLocalDateString(timezone);
  return {
    title: "Your weekly report is ready 📊",
    body: `See how ${childName}'s week went and what to focus on next.`,
    deepLink: "/hub",
    dedupKey: `weekly:${date}`,
    data: child ? { childId: child.id } : {},
  };
}

/* ----------------------  Smart engagement logic  ---------------------- */

/**
 * Build the most relevant engagement notification (or null if none applies):
 * - inactive 3+ days → re-engagement
 * - 7-day streak → reward
 * - low recent activity → gentle nudge
 */
export async function buildEngagement(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  // Most recent behavior log = proxy for "last activity".
  // Behaviors are scoped by child, so filter using the primary child's id.
  const [lastBehavior] = await db
    .select({ createdAt: behaviorsTable.createdAt })
    .from(behaviorsTable)
    .where(eq(behaviorsTable.childId, child.id))
    .orderBy(desc(behaviorsTable.createdAt))
    .limit(1);

  const lastActiveAt = lastBehavior?.createdAt ?? null;
  const inactive = !lastActiveAt || lastActiveAt < threeDaysAgo;

  if (inactive) {
    return {
      title: `${child.name} misses you 💜`,
      body: "Check in with a quick note about today — it only takes a moment.",
      deepLink: "/hub",
      dedupKey: `inactive:${date}`,
      data: { childId: child.id, reason: "inactive" },
    };
  }

  // Streak check via user_progress (last 7 days had at least one entry).
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const recent = await db
    .select({ createdAt: userProgressTable.createdAt })
    .from(userProgressTable)
    .where(
      and(
        eq(userProgressTable.userId, userId),
        gte(userProgressTable.createdAt, sevenDaysAgo),
      ),
    )
    .limit(20);
  const distinctDays = new Set(
    recent.map((r) => new Date(r.createdAt).toISOString().slice(0, 10)),
  );
  if (distinctDays.size >= 7) {
    return {
      title: "7-day streak! 🔥",
      body: `You've shown up for ${child.name} every day this week. Amazing.`,
      deepLink: "/hub",
      dedupKey: `streak7:${date}`,
      data: { childId: child.id, reason: "streak" },
    };
  }

  // Light low-engagement nudge if fewer than 3 days active in past week.
  if (distinctDays.size > 0 && distinctDays.size < 3) {
    return {
      title: "Small wins add up ✨",
      body: `Log just one thing about ${child.name} today to keep the rhythm going.`,
      deepLink: "/hub",
      dedupKey: `nudge:${date}`,
      data: { childId: child.id, reason: "low_engagement" },
    };
  }

  return null;
}

/**
 * Nutrition suggestion driven by the child's recent meal/routine activity.
 * If we have recent routines that include meals, suggest variety; otherwise
 * fall back to a generic age-appropriate tip.
 */
export async function buildNutritionInsight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Routines are scoped by child, so filter using the primary child's id.
  const recentRoutines = await db
    .select({ id: routinesTable.id })
    .from(routinesTable)
    .where(
      and(
        eq(routinesTable.childId, child.id),
        gte(routinesTable.createdAt, sevenDaysAgo),
      ),
    )
    .limit(5);

  const tips: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: "Toddlers do best with small, frequent meals and a finger-food snack.",
    preschool: "Preschoolers love colourful plates — aim for two colours at every meal.",
    child: "School-age kids need protein at breakfast to focus through morning class.",
    tween: "Tweens have growing appetites — pair carbs with protein at every meal.",
  };

  const body =
    recentRoutines.length === 0
      ? `${tips[ageGroup(child.age)]} Tap for a tailored plan.`
      : `Based on this week, here are 3 fresh meal ideas for ${child.name}.`;

  return {
    title: "Nutrition tip 🥗",
    body,
    deepLink: "/meals",
    dedupKey: `nutrition:${date}`,
    data: { childId: child.id },
  };
}

/**
 * Amy AI insight — uses the child's recent activity (last 7 days of completed
 * routines, behaviour logs, parent-hub progress) to produce a personalised
 * tip. Falls back to the age-group template if no signal is available.
 */
export async function buildAmyInsight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Pull the last week of routines for this child + recent behaviour notes +
  // parent-hub progress feedback rows.
  const [routines, recentBehaviors, recentProgress] = await Promise.all([
    db
      .select({ items: routinesTable.items, date: routinesTable.date })
      .from(routinesTable)
      .where(
        and(
          eq(routinesTable.childId, child.id),
          gte(routinesTable.createdAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(routinesTable.createdAt))
      .limit(7),
    db
      .select({ behavior: behaviorsTable.behavior, type: behaviorsTable.type, createdAt: behaviorsTable.createdAt })
      .from(behaviorsTable)
      .where(
        and(
          eq(behaviorsTable.childId, child.id),
          gte(behaviorsTable.createdAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(behaviorsTable.createdAt))
      .limit(10),
    db
      .select({ feedback: userProgressTable.feedback, planTitle: userProgressTable.planTitle })
      .from(userProgressTable)
      .where(
        and(
          eq(userProgressTable.userId, userId),
          gte(userProgressTable.createdAt, sevenDaysAgo),
        ),
      )
      .limit(20),
  ]);

  // Tally completion across this week's routines.
  let completed = 0;
  let total = 0;
  for (const r of routines) {
    const items = (r.items ?? []) as Array<{ status?: string }>;
    for (const it of items) {
      total++;
      if (it.status === "completed" || it.status === "done") completed++;
    }
  }
  const completionRate = total > 0 ? completed / total : 0;
  const positiveBehaviors = recentBehaviors.filter((b) => b.type === "positive").length;
  const challengingBehaviors = recentBehaviors.filter(
    (b) => b.type === "challenging" || b.type === "negative",
  ).length;
  const hubWins = recentProgress.filter((p) => p.feedback === "yes").length;

  // Pick the most relevant signal in priority order. Each branch keeps the
  // body short (≤ 110 chars) so it renders fully on iOS / Android lock screens.
  let body: string | null = null;
  if (total >= 3 && completionRate >= 0.7) {
    body = `${child.name} finished ${completed} of ${total} routine tasks this week — keep celebrating those wins.`;
  } else if (total >= 3 && completionRate <= 0.3) {
    body = `Only ${completed}/${total} tasks done this week. Try shrinking ${child.name}'s routine to 3 essentials.`;
  } else if (challengingBehaviors >= 2 && challengingBehaviors > positiveBehaviors) {
    body = `Tough week noted for ${child.name}. Try a 5-minute calm-corner reset before the next flare-up.`;
  } else if (positiveBehaviors >= 2) {
    body = `${positiveBehaviors} positive moments logged for ${child.name} — name them out loud to reinforce.`;
  } else if (hubWins >= 3) {
    body = `You logged ${hubWins} parenting wins in the Hub this week — pick one to repeat tomorrow.`;
  }

  if (!body) {
    const insights: Record<ReturnType<typeof ageGroup>, string> = {
      toddler: `Naming feelings out loud helps ${child.name} build emotional vocabulary.`,
      preschool: `Try a 5-minute "calm corner" with ${child.name} after big emotions.`,
      child: `${child.name} is at the age where chores build real confidence.`,
      tween: `Open-ended questions get more from ${child.name} than yes/no ones.`,
    };
    body = insights[ageGroup(child.age)];
  }

  // Phase 4 — Productive nudges. If a high-priority nudge exists, prefer it
  // over the generic insight body. Wrapped so any failure (DB, ranker)
  // gracefully falls back to the existing copy.
  let deepLink = "/hub";
  let dedupSuffix = "";
  let topNudgeId: string | null = null;
  try {
    const result = await computeProductiveNudgesForChild(child.id);
    const top = result.nudges[0];
    if (top && top.priority >= 70) {
      body = renderNudgeBodyForPush(top, child.name);
      // Use the allowlisted `/routine` shorthand so mobile's strict
      // DEEP_LINK_MAP routes the tap. The nudge id travels in `data` so the
      // routines screen can scroll/highlight if it chooses.
      deepLink = "/routine";
      dedupSuffix = `:nudge:${top.id}`;
      topNudgeId = top.id;
    }
  } catch {
    // fall through with the existing body / deepLink
  }

  return {
    title: "Today's Amy insight 💡",
    body,
    deepLink,
    dedupKey: `insight:${date}${dedupSuffix}`,
    data: topNudgeId
      ? { childId: child.id, nudgeId: topNudgeId }
      : { childId: child.id },
  };
}

/* ----------------------  Per-task routine reminder  -------------------- */

/**
 * Build the reminder for a single routine item (e.g. "Breakfast at 8:00 AM").
 * Used by the per-minute scheduler in notificationCron.
 */
export function buildRoutineItem(opts: {
  childName: string;
  childId: number;
  routineId: number;
  itemIndex: number;
  itemTime: string;
  activity: string;
  date: string;
}): BuiltNotification {
  return {
    title: `${opts.activity} at ${opts.itemTime}`,
    body: `Time for ${opts.childName} to start: ${opts.activity}.`,
    deepLink: "/routine",
    dedupKey: `routine_item:${opts.routineId}:${opts.itemIndex}:${opts.date}`,
    data: {
      childId: opts.childId,
      routineId: opts.routineId,
      itemIndex: opts.itemIndex,
    },
  };
}

/**
 * Test-mode builder for `routine_item`. Picks the next non-completed item
 * from the user's most recent routine and renders the same notification the
 * per-minute scheduler would. Returns null if there's nothing to remind
 * about (e.g. no routine for today, all items done).
 */
async function buildRoutineItemTest(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  const [routine] = await db
    .select()
    .from(routinesTable)
    .where(and(eq(routinesTable.childId, child.id), eq(routinesTable.date, date)))
    .limit(1);
  if (!routine) return null;
  const items = (routine.items ?? []) as Array<{ time?: string; activity?: string; status?: string }>;
  const next = items.find(
    (it) => it.time && it.activity && it.status !== "completed" && it.status !== "skipped",
  );
  if (!next) return null;
  return buildRoutineItem({
    childName: child.name,
    childId: child.id,
    routineId: routine.id,
    itemIndex: items.indexOf(next),
    itemTime: next.time!,
    activity: next.activity!,
    date,
  });
}

/** Map a category to its content builder. */
export const contentBuilders: Record<
  NotificationCategory,
  (userId: string, timezone: string) => Promise<BuiltNotification | null>
> = {
  routine: buildMorningRoutine,
  routine_item: buildRoutineItemTest,
  nutrition: buildNutritionInsight,
  insights: buildAmyInsight,
  weekly: buildWeeklyReport,
  engagement: buildEngagement,
  good_night: buildGoodNight,
};
