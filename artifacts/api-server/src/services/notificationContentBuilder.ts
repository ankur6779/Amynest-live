import { and, desc, eq, gte } from "drizzle-orm";
import {
  childrenTable,
  db,
  routinesTable,
  behaviorsTable,
  userProgressTable,
  type NotificationCategory,
} from "@workspace/db";

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
  const [lastBehavior] = await db
    .select({ createdAt: behaviorsTable.createdAt })
    .from(behaviorsTable)
    .where(eq(behaviorsTable.userId, userId))
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
  const recentRoutines = await db
    .select({ id: routinesTable.id })
    .from(routinesTable)
    .where(
      and(
        eq(routinesTable.userId, userId),
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
 * Amy AI insight — surfaces a parenting tip relevant to the child's age and
 * recent behavior log.
 */
export async function buildAmyInsight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const insights: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: `Naming feelings out loud helps ${child.name} build emotional vocabulary.`,
    preschool: `Try a 5-minute "calm corner" with ${child.name} after big emotions.`,
    child: `${child.name} is at the age where chores build real confidence.`,
    tween: `Open-ended questions get more from ${child.name} than yes/no ones.`,
  };

  return {
    title: "Today's Amy insight 💡",
    body: insights[ageGroup(child.age)],
    deepLink: "/hub",
    dedupKey: `insight:${date}`,
    data: { childId: child.id },
  };
}

/** Map a category to its content builder. */
export const contentBuilders: Record<
  NotificationCategory,
  (userId: string, timezone: string) => Promise<BuiltNotification | null>
> = {
  routine: buildMorningRoutine,
  nutrition: buildNutritionInsight,
  insights: buildAmyInsight,
  weekly: buildWeeklyReport,
  engagement: buildEngagement,
  good_night: buildGoodNight,
};
