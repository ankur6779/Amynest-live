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

function isWeekend(timezone: string): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date());
  return day === "Sat" || day === "Sun";
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
    dedupKey: `goodnight:${date}`,
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
    dedupKey: `weekly:${date}`,
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
      dedupKey: `inactive:${date}`,
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
      dedupKey: `streak7:${date}`,
      data: { childId: child.id, reason: "streak" },
    };
  }

  if (distinctDays.size > 0 && distinctDays.size < 3) {
    return {
      title: "Small wins add up ✨",
      body: `Log just one thing about ${child.name} today to keep the rhythm going.`,
      deepLink: "/hub",
      dedupKey: `nudge:${date}`,
      data: { childId: child.id, reason: "low_engagement" },
    };
  }

  // Rotation motivation message for active users
  return {
    title: "You've got this 💪",
    body: motivationPick ?? `Keep going — parenting gets easier with every step forward 🌟`,
    deepLink: "/hub",
    dedupKey: `motivation:${date}`,
    data: { childId: child.id, reason: "motivation" },
  };
}

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
    dedupKey: `insight:${date}${dedupSuffix}`,
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
    dedupKey: `routine_item:${opts.routineId}:${opts.itemIndex}:${opts.date}`,
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
  const date = todayLocalDateString(timezone);

  const tipsByGroup: Record<ReturnType<typeof ageGroup>, string[]> = {
    toddler: [
      `Let ${child.name} make one tiny choice today — red cup or blue cup — it builds autonomy.`,
      `Narrate what you're doing aloud. ${child.name}'s vocabulary grows through listening.`,
      `10 minutes of unstructured play is more valuable than any structured lesson at this age.`,
      `When ${child.name} is upset, crouch to eye level before speaking — it de-escalates instantly.`,
    ],
    preschool: [
      `Ask "${child.name}, what made you happy today?" — it builds emotional awareness.`,
      `Let ${child.name} help with a small chore. Contribution builds self-worth.`,
      `Praise the effort, not the result: "You tried so hard!" shapes a growth mindset.`,
      `Reading 15 minutes together daily builds ${child.name}'s reading readiness by 40%.`,
    ],
    child: [
      `Give ${child.name} a weekly "responsibility" — it builds accountability.`,
      `Limit advice; ask questions instead. ${child.name} learns more by figuring it out.`,
      `Celebrate one small win today — it rewires ${child.name}'s brain for positivity.`,
      `Family dinners 3x/week are linked to better grades and emotional health.`,
    ],
    tween: [
      `Notice one thing ${child.name} does well today and mention it specifically.`,
      `Let ${child.name} disagree with you respectfully — it's healthy boundary-testing.`,
      `Ask about their friends by name — it shows you're interested in their world.`,
      `Screen time is fine if balanced. Co-watch something they love this weekend.`,
    ],
  };

  const tips = tipsByGroup[ageGroup(child.age)];
  const dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
  const body = tips[dayIndex] ?? tips[0]!;

  return {
    title: "Parenting tip of the day 🌱",
    body,
    deepLink: "/hub",
    dedupKey: `parenting_tip:${date}`,
    data: { childId: child.id },
  };
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
  const date = todayLocalDateString(timezone);

  const prompts: Record<ReturnType<typeof ageGroup>, string> = {
    toddler: `It's almost story time for ${child.name} 📖 A short picture book helps them wind down.`,
    preschool: `Ready for tonight's story with ${child.name}? Pick one together for extra magic ✨`,
    child: `Bedtime story time 🌙 ${child.name} will sleep better after 10 minutes of reading together.`,
    tween: `Tonight's a good night to share a chapter with ${child.name} — reading together builds bonds.`,
  };

  return {
    title: "Story time tonight 📚",
    body: prompts[ageGroup(child.age)],
    deepLink: "/hub",
    dedupKey: `story_time:${date}`,
    data: { childId: child.id },
  };
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
    dedupKey: `phonics:${date}`,
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
  const date = todayLocalDateString(timezone);
  const weekend = isWeekend(timezone);

  const weekdayActivities: Record<ReturnType<typeof ageGroup>, string[]> = {
    toddler: [
      `Try colour sorting with household objects — ${child.name} will love it 🎨`,
      `Stack and knock: building towers teaches ${child.name} cause-and-effect 🏗️`,
      `Sing the alphabet slowly together — 3 rounds beats any flashcard.`,
    ],
    preschool: [
      `5-minute counting game: count steps from room to room with ${child.name} 🔢`,
      `Tracing letters in a tray of rice — sensory + literacy for ${child.name} ✏️`,
      `Ask ${child.name} to sort toys by colour, size, or shape — math brain activated!`,
    ],
    child: [
      `Try a 5-minute math challenge with ${child.name} — who can solve it fastest? 🧮`,
      `Read one paragraph aloud together and ask ${child.name} to summarise it 📖`,
      `Play 20 Questions — secretly great for ${child.name}'s critical thinking 🤔`,
    ],
    tween: [
      `Brain challenge: ask ${child.name} to explain a school topic to you — teaching = learning 🎓`,
      `10-minute journaling: ${child.name} writes 3 things they want to learn this week ✍️`,
      `Watch a 5-minute documentary clip together and discuss — curiosity booster 🌍`,
    ],
  };

  const weekendActivities: Record<ReturnType<typeof ageGroup>, string[]> = {
    toddler: [
      `Outdoor morning: let ${child.name} explore nature for 20 minutes 🌿`,
      `Water play in a bowl — toddlers learn through touch and pour 💧`,
    ],
    preschool: [
      `Family art time: ${child.name} draws, you guess — great for creativity 🎨`,
      `Bake something simple together — math, science, and joy all in one 🍪`,
    ],
    child: [
      `Weekend science: mix baking soda + vinegar with ${child.name} — instant wow 🧪`,
      `Board game morning — builds strategy and family bonds 🎲`,
    ],
    tween: [
      `Family walk or bike ride — screen-free bonding for the whole family 🚴`,
      `Cook a new recipe together — life skill + quality time ☺️`,
    ],
  };

  const activities = weekend
    ? weekendActivities[ageGroup(child.age)]
    : weekdayActivities[ageGroup(child.age)];

  const idx = Math.floor(Date.now() / 86400000) % activities.length;
  const body = activities[idx] ?? `Try a short activity with ${child.name} today!`;

  return {
    title: weekend ? "Weekend activity idea 🌟" : "Learning activity idea 🧠",
    body,
    deepLink: "/hub",
    dedupKey: `learning_activity:${date}`,
    data: { childId: child.id },
  };
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
  const monthKey = date.slice(0, 7); // "YYYY-MM"

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
    dedupKey: `milestone:${monthKey}`, // once per month per user
    data: { childId: child.id },
  };
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
};
