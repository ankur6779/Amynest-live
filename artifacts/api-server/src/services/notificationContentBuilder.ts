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
import { buildAdaptiveCategoryNotification } from "./notificationAdaptiveBridge.js";
import { contentFingerprint } from "@workspace/notification-engine";

export interface BuiltNotification {
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  data?: Record<string, unknown>;
  contentMeta?: {
    contentHash?: string;
    topicKey?: string;
    recommendationKey?: string;
    theme?: string;
    contentType?: string;
    noveltyScore?: number;
    relevanceScore?: number;
    recencyScore?: number;
    engagementPredictionScore?: number;
    qualityScore?: number;
    businessImpactScore?: number;
    routineCompletionProb?: number;
    learningCompletionProb?: number;
    retentionProb?: number;
    subscriptionProb?: number;
    engagementProb?: number;
  };
  outcomeMeta?: {
    goal?: string;
    childLifecycleStage?: string;
    parentMilestone?: string | null;
    campaignId?: string | null;
    campaignStep?: number | null;
    experimentId?: string | null;
    experimentVariant?: string | null;
  };
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


/* ─────────────────────────────  Routine  ─────────────────────────────── */

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
    dedupKey: contentFingerprint(child.id, "morning_routine", "daily", date),
    data: { childId: child.id },
  };
}

export async function buildSnackTime(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const adaptive = await buildAdaptiveCategoryNotification(userId, timezone, "nutrition", child);
  if (adaptive) return adaptive;
  const date = todayLocalDateString(timezone);
  return {
    title: "Snack time idea 🍎",
    body: `See fresh meal ideas for ${child.name} in AmyNest.`,
    deepLink: "/meals",
    dedupKey: contentFingerprint(child.id, "snack_time", "daily", date),
    data: { childId: child.id },
  };
}

export async function buildDinnerSuggestion(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  return buildAdaptiveCategoryNotification(userId, timezone, "nutrition", child);
}

export async function buildGoodNight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);
  const tips: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: `Dim the lights and keep noise low — ${child.name} sleeps best in calm surroundings.`,
    preschool: `A 10-minute story before bed helps ${child.name} transition to sleep.`,
    child: `Screens off 30 minutes before bed helps ${child.name} sleep deeper.`,
    tween: `A short breathing exercise can help ${child.name} unwind tonight.`,
  };
  return {
    title: `Good night, ${child.name} 🌙`,
    body: tips[ageGroup(child.age)],
    deepLink: "/hub",
    dedupKey: contentFingerprint(child.id, "good_night", "daily", date),
    data: { childId: child.id },
  };
}

/* ─────────────────────────────  Weekly  ──────────────────────────────── */

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
    dedupKey: contentFingerprint(child?.id, "weekly_report", "daily", date),
    data: child ? { childId: child.id } : {},
  };
}

/* ────────────────────────  Smart engagement logic  ───────────────────── */

export async function buildEngagement(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const { getJourneyStatus } = await import("./journeyService.js");
  const journey = await getJourneyStatus(userId);
  if (journey?.active && journey.todayTask && !journey.todayTask.completed) {
    const day = journey.todayTask.day;
    const journeyNudges: Record<
      number,
      { title: string; body: string; deepLink: string }
    > = {
      1: {
        title: "Day 1: Create today's routine ✨",
        body: `Kick off ${child.name}'s 7-day journey — generate a routine in one tap.`,
        deepLink: "/routines/generate",
      },
      2: {
        title: "Day 2: Mark a task done ✅",
        body: `Complete one item on ${child.name}'s routine to keep your streak going.`,
        deepLink: "/routines",
      },
      3: {
        title: "Day 3: Explore Parent Hub 🧭",
        body: "Discover activities, tips, and learning tools built for your family.",
        deepLink: "/parenting-hub",
      },
      4: {
        title: "Day 4: Log a win 📝",
        body: `Note one thing about ${child.name} today — it helps Amy learn your patterns.`,
        deepLink: "/behavior",
      },
      5: {
        title: "Day 5: Fun learning time 🎮",
        body: `Try a puzzle or game with ${child.name} — small wins build big habits.`,
        deepLink: "/games",
      },
      6: {
        title: "Amy has a quick thought for you",
        body: "Small progress matters — ready for a quick coaching check-in?",
        deepLink: "/amy-coach",
      },
      7: {
        title: "Day 7: See your progress 📊",
        body: "You've come far — review your weekly insights and celebrate!",
        deepLink: "/insights",
      },
    };
    const nudge = journeyNudges[day];
    if (nudge) {
      return {
        title: nudge.title,
        body: nudge.body,
        deepLink: nudge.deepLink,
        dedupKey: contentFingerprint(child.id, "engagement", `journey_d${day}`, date),
        data: { childId: child.id, reason: "journey", journeyDay: day },
      };
    }
  }

  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const [lastBehavior] = await db
    .select({ createdAt: behaviorsTable.createdAt })
    .from(behaviorsTable)
    .where(eq(behaviorsTable.childId, child.id))
    .orderBy(desc(behaviorsTable.createdAt))
    .limit(1);

  const lastActiveAt = lastBehavior?.createdAt ?? null;
  const inactive = !lastActiveAt || lastActiveAt < threeDaysAgo;

  const motivations = [
    `You're doing an amazing job, ${child.name} is lucky to have you 💜`,
    `Small consistent actions make the biggest difference for ${child.name}.`,
    `Every routine you build now shapes ${child.name}'s future habits.`,
    `Keep going — parenting gets easier with every step forward 🌟`,
  ];
  const motivationPick = motivations[Math.floor(Date.now() / 86400000) % motivations.length];

  if (inactive) {
    return {
      title: `${child.name} misses you 💜`,
      body: "Check in with a quick note about today — it only takes a moment.",
      deepLink: "/hub",
      dedupKey: contentFingerprint(child.id, "engagement", "inactive", date),
      data: { childId: child.id, reason: "inactive" },
    };
  }

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
      dedupKey: contentFingerprint(child.id, "engagement", "streak7", date),
      data: { childId: child.id, reason: "streak" },
    };
  }

  if (distinctDays.size > 0 && distinctDays.size < 3) {
    return {
      title: "Small wins add up ✨",
      body: `Log just one thing about ${child.name} today to keep the rhythm going.`,
      deepLink: "/hub",
      dedupKey: contentFingerprint(child.id, "engagement", "nudge", date),
      data: { childId: child.id, reason: "low_engagement" },
    };
  }

  // Rotation motivation message for active users — adaptive engine
  const adaptive = await buildAdaptiveCategoryNotification(userId, timezone, "engagement", child);
  if (adaptive) return adaptive;

  return {
    title: "You've got this 💪",
    body: motivationPick ?? `Keep going — parenting gets easier with every step forward 🌟`,
    deepLink: "/hub",
    dedupKey: contentFingerprint(child.id, "engagement", "motivation", date),
    data: { childId: child.id, reason: "motivation" },
  };
}

export async function buildNutritionInsight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  return buildAdaptiveCategoryNotification(userId, timezone, "nutrition", child);
}

export async function buildAmyInsight(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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

  let deepLink = "/hub";
  let dedupSuffix = "";
  let topNudgeId: string | null = null;
  try {
    const result = await computeProductiveNudgesForChild(child.id);
    const top = result.nudges[0];
    if (top && top.priority >= 70) {
      body = renderNudgeBodyForPush(top, child.name);
      deepLink = "/routine";
      dedupSuffix = `:nudge:${top.id}`;
      topNudgeId = top.id;
    }
  } catch {
    // fall through
  }

  return {
    title: "Today's Amy insight 💡",
    body,
    deepLink,
    dedupKey: contentFingerprint(child.id, "insights", `amy${dedupSuffix.replace(/:/g, "_")}`, date),
    data: topNudgeId
      ? { childId: child.id, nudgeId: topNudgeId }
      : { childId: child.id },
  };
}

/* ─────────────────────────  Per-task routine reminder  ───────────────── */

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
    dedupKey: contentFingerprint(
      opts.childId,
      "routine_item",
      `r${opts.routineId}_i${opts.itemIndex}`,
      opts.date,
    ),
    data: {
      childId: opts.childId,
      routineId: opts.routineId,
      itemIndex: opts.itemIndex,
    },
  };
}

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

/* ────────────────────────  NEW: Smart Engine Categories  ─────────────── */

/**
 * Daily parenting micro-tip — age-appropriate, rotates across a pool of
 * evidence-based suggestions. Fires at 09:00 local (post morning-routine slot).
 */
export async function buildParentingTip(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  return buildAdaptiveCategoryNotification(userId, timezone, "parenting_tips", child);
}

/**
 * Bedtime story reminder — fires at 20:00 local to prompt the parent to
 * start a wind-down reading session before the good_night message.
 */
export async function buildStoryTime(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  return buildAdaptiveCategoryNotification(userId, timezone, "story_time", child);
}

/**
 * Phonics practice nudge — fires at 16:00 local (after-school slot).
 * Skips weekends when children have more free-form time.
 */
export async function buildPhonicsReminder(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  // Phonics is most relevant for preschool & early child; skip for tweens
  const ag = ageGroup(child.age);
  if (ag === "tween") return null;

  const messages: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: `5 minutes of letter sounds with ${child.name} goes a long way today 🔤`,
    preschool: `${child.name} has a phonics activity waiting — just 5 minutes builds big skills 🔡`,
    child: `Quick phonics check-in for ${child.name}? Tap to see today's practice word 📝`,
    tween: ``,
  };

  return {
    title: "Phonics practice time 🔤",
    body: messages[ag] || `Time for a quick phonics session with ${child.name}!`,
    deepLink: "/study-zone",
    dedupKey: contentFingerprint(child.id, "phonics", "daily", date),
    data: { childId: child.id },
  };
}

/**
 * Learning activity suggestion — fires at 10:30 local (mid-morning).
 * On weekends pushes family-friendly activities.
 */
export async function buildLearningActivity(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  return buildAdaptiveCategoryNotification(userId, timezone, "learning_activity", child);
}

/**
 * Developmental milestone alert — fires at 11:00 local. Checks child's
 * current age band and surfaces one relevant milestone to watch for.
 * Returns null if we've already sent a milestone for this month.
 */
export async function buildMilestoneAlert(
  userId: string,
  timezone: string,
): Promise<BuiltNotification | null> {
  const child = await getPrimaryChild(userId);
  if (!child) return null;
  const date = todayLocalDateString(timezone);

  const milestonesByGroup: Record<ReturnType<typeof ageGroup>, string[]> = {
    toddler: [
      `${child.name} should be starting to string 2-word phrases — celebrate each new combo 🌟`,
      `At this age, ${child.name} is learning to self-feed — embrace the mess, it builds confidence.`,
      `${child.name} might be entering the "no" phase — this is healthy autonomy development.`,
      `Watch for ${child.name} starting to play alongside other kids (parallel play) — a big step!`,
    ],
    preschool: [
      `${child.name} should be able to draw a simple person — ask them to draw you! 🎨`,
      `Counting to 10 is a key milestone for ${child.name}'s age — make it a daily game.`,
      `${child.name} may be developing "best friend" preferences — this is socially healthy.`,
      `Writing their own name is a big milestone — celebrate every letter ${child.name} gets right.`,
    ],
    child: [
      `${child.name} is at the age of logical reasoning — involve them in simple problem-solving.`,
      `Reading chapter books independently is a key milestone — celebrate ${child.name}'s progress!`,
      `${child.name} may start showing empathy for others — reinforce and model it daily.`,
      `Building a 10-minute focus span is key at this age — short tasks help ${child.name} build it.`,
    ],
    tween: [
      `${child.name} is entering the identity formation stage — their opinions matter, hear them out.`,
      `Abstract reasoning kicks in at this age — great time for strategy games with ${child.name}.`,
      `${child.name} may be experiencing peer pressure — keep communication open and non-judgmental.`,
      `Independence is a key milestone now — let ${child.name} manage one area of their life fully.`,
    ],
  };

  const milestones = milestonesByGroup[ageGroup(child.age)];
  const ageMonthsKey = Math.floor(child.ageMonths / 3); // changes every 3 months
  const body = milestones[ageMonthsKey % milestones.length] ?? milestones[0]!;

  return {
    title: `Milestone check for ${child.name} 📈`,
    body,
    deepLink: "/hub",
    dedupKey: contentFingerprint(child.id, "milestone", "daily_check", date),
    data: { childId: child.id },
  };
}

/** Infant pushes are composed by infantNotificationScheduler, not the generic cron builders. */
async function buildInfantCare(_userId: string, _timezone: string): Promise<BuiltNotification | null> {
  return null;
}

/* ─────────────────────────────  Content map  ─────────────────────────── */

/** Map a category to its content builder. */
export const contentBuilders: Record<
  NotificationCategory,
  (userId: string, timezone: string) => Promise<BuiltNotification | null>
> = {
  routine:           buildMorningRoutine,
  routine_item:      buildRoutineItemTest,
  nutrition:         buildNutritionInsight,
  insights:          buildAmyInsight,
  weekly:            buildWeeklyReport,
  engagement:        buildEngagement,
  good_night:        buildGoodNight,
  parenting_tips:    buildParentingTip,
  story_time:        buildStoryTime,
  phonics:           buildPhonicsReminder,
  learning_activity: buildLearningActivity,
  milestone:         buildMilestoneAlert,
  infant_care:       buildInfantCare,
};
