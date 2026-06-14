import { eq, inArray } from "drizzle-orm";
import { db, childrenTable, routinesTable, behaviorsTable } from "@workspace/db";

export type InsightsRange = "week" | "month";

export type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
};

export type PerChildInsights = {
  childId: number;
  childName: string;
  routinesCount: number;
  behaviorsCount: number;
  positiveCount: number;
  positiveRate: number;
  routineCompletionRate: number;
  topCategory: string | null;
  milestoneCount: number;
  activeDays: number;
  morningCount: number;
  eveningCount: number;
  categoryVariety: number;
};

export type SiblingHighlight = {
  childId: number;
  childName: string;
  headline: string;
  detail: string;
  icon:
    | "calendar"
    | "happy"
    | "heart"
    | "trophy"
    | "color-palette"
    | "flame"
    | "sunny"
    | "moon"
    | "sparkles";
  accent: string;
};

export type InsightsResponse = {
  range: InsightsRange;
  generatedAt: string;
  hasChildren: boolean;
  hasActivity: boolean;
  emptyReason: "no_children" | "no_activity" | null;
  summary: {
    routinesThisPeriod: number;
    routinesPreviousPeriod: number;
    routinesChangePct: number;
    behaviorsThisPeriod: number;
    behaviorsPreviousPeriod: number;
    positiveRateThisPeriod: number;
    positiveRatePreviousPeriod: number;
    positiveRateChangePts: number;
  };
  perChild: PerChildInsights[];
  siblingHighlights: SiblingHighlight[];
  activityMix: Array<{ category: string; count: number }>;
  dayOfWeek: Array<{ day: string; count: number }>;
  timeOfDay: { morning: number; afternoon: number; evening: number };
  behaviorTypes: { positive: number; negative: number; neutral: number; milestone: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0]!;
}

function daysAgoIso(days: number): string {
  return isoDay(new Date(Date.now() - days * DAY_MS));
}

function emptyDayOfWeek(): { day: string; count: number }[] {
  return DAY_LABELS.map((day) => ({ day, count: 0 }));
}

const EMPTY_SUMMARY = {
  routinesThisPeriod: 0,
  routinesPreviousPeriod: 0,
  routinesChangePct: 0,
  behaviorsThisPeriod: 0,
  behaviorsPreviousPeriod: 0,
  positiveRateThisPeriod: 0,
  positiveRatePreviousPeriod: 0,
  positiveRateChangePts: 0,
};

/** Safe empty payload when insights cannot be computed (circuit breaker / DB error). */
export function buildInsightsFallback(range: InsightsRange = "week"): InsightsResponse & { fallback: true } {
  return {
    range,
    generatedAt: new Date().toISOString(),
    hasChildren: false,
    hasActivity: false,
    emptyReason: null,
    fallback: true,
    summary: { ...EMPTY_SUMMARY },
    perChild: [],
    siblingHighlights: [],
    activityMix: [],
    dayOfWeek: emptyDayOfWeek(),
    timeOfDay: { morning: 0, afternoon: 0, evening: 0 },
    behaviorTypes: { positive: 0, negative: 0, neutral: 0, milestone: 0 },
  };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function timeBucketFor(time: string): "morning" | "afternoon" | "evening" {
  const match = time.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
  if (!match) return "afternoon";
  let hour = parseInt(match[1]!, 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Build "Family strengths" — one celebratory headline per child, on a
 * different dimension where possible, so no child ever ranks last. Pure
 * function for easy testing.
 *
 * Tone rules: never compare children negatively, never use "weakest", never
 * imply ranking. Each headline names a real strength backed by data. Children
 * with no activity get a gentle "let's spend time" nudge only when at least
 * one sibling does have activity.
 */
export function buildSiblingHighlights(perChild: PerChildInsights[]): SiblingHighlight[] {
  if (perChild.length < 2) return [];

  const active = perChild.filter(
    (c) => c.routinesCount > 0 || c.behaviorsCount > 0,
  );
  if (active.length === 0) return [];

  type Dim =
    | "routines"
    | "moments"
    | "positive"
    | "milestones"
    | "variety"
    | "consistency"
    | "morning"
    | "evening";

  const dimensions: Array<{
    key: Dim;
    value: (c: PerChildInsights) => number;
    minimum: number;
    headline: string;
    detail: (c: PerChildInsights) => string;
    icon: SiblingHighlight["icon"];
    accent: string;
  }> = [
    {
      key: "routines",
      value: (c) => c.routinesCount,
      minimum: 1,
      headline: "Routine rhythm",
      detail: (c) =>
        `Planned ${c.routinesCount} routine${c.routinesCount === 1 ? "" : "s"} — keep that rhythm going.`,
      icon: "calendar",
      accent: "#34D399",
    },
    {
      key: "moments",
      value: (c) => c.behaviorsCount,
      minimum: 2,
      headline: "Moment magnet",
      detail: (c) =>
        `${c.behaviorsCount} moments captured — every observation builds the picture.`,
      icon: "happy",
      accent: "#FBBF24",
    },
    {
      key: "positive",
      value: (c) => (c.behaviorsCount >= 3 ? c.positiveRate : -1),
      minimum: 50,
      headline: "Sunshine soul",
      detail: (c) => `${c.positiveRate}% of moments were positive this period.`,
      icon: "heart",
      accent: "#FF4ECD",
    },
    {
      key: "milestones",
      value: (c) => c.milestoneCount,
      minimum: 1,
      headline: "Milestone maker",
      detail: (c) =>
        `Hit ${c.milestoneCount} milestone${c.milestoneCount === 1 ? "" : "s"} — worth celebrating.`,
      icon: "trophy",
      accent: "#F59E0B",
    },
    {
      key: "variety",
      value: (c) => c.categoryVariety,
      minimum: 3,
      headline: "Curious explorer",
      detail: (c) => `Tried ${c.categoryVariety} different activity types${c.topCategory ? `, with a love for ${c.topCategory}` : ""}.`,
      icon: "color-palette",
      accent: "#8B5CF6",
    },
    {
      key: "consistency",
      value: (c) => c.activeDays,
      minimum: 3,
      headline: "Showing-up streak",
      detail: (c) =>
        `Active on ${c.activeDays} day${c.activeDays === 1 ? "" : "s"} — consistency is its own win.`,
      icon: "flame",
      accent: "#EF4444",
    },
    {
      key: "morning",
      value: (c) => (c.morningCount > c.eveningCount ? c.morningCount : -1),
      minimum: 3,
      headline: "Morning glow",
      detail: () => `Most active in the morning — routines flow best then.`,
      icon: "sunny",
      accent: "#FCD34D",
    },
    {
      key: "evening",
      value: (c) => (c.eveningCount > c.morningCount ? c.eveningCount : -1),
      minimum: 3,
      headline: "Evening focus",
      detail: () => `Hits stride after dark — schedule cosy tasks then.`,
      icon: "moon",
      accent: "#60A5FA",
    },
  ];

  // Build per-child eligibility: for each child, the dimensions where they
  // both meet the dimension's minimum AND lead all siblings on it.
  type Eligible = { dim: typeof dimensions[number]; value: number };
  const eligible: Eligible[][] = perChild.map((child) => {
    const isInactive = child.routinesCount === 0 && child.behaviorsCount === 0;
    if (isInactive) return [];
    const out: Eligible[] = [];
    for (const dim of dimensions) {
      const myValue = dim.value(child);
      if (myValue < dim.minimum) continue;
      const siblingMax = Math.max(
        ...perChild.filter((p) => p.childId !== child.childId).map((p) => dim.value(p)),
      );
      if (myValue < siblingMax) continue;
      out.push({ dim, value: myValue });
    }
    return out.sort((a, b) => b.value - a.value);
  });

  // Backtracking search across child→dimension assignments. Maximises the
  // number of children that get a unique leading dimension; among
  // equally-covered assignments, prefers the one with the highest summed
  // values (so a strong leader still picks their best dimension when
  // possible). Search space is tiny (children ≤ ~6, dims = 8) so this is
  // effectively free.
  let bestAssignment: (Eligible | null)[] = perChild.map(() => null);
  let bestCovered = -1;
  let bestScore = -1;

  function search(idx: number, used: Set<Dim>, current: (Eligible | null)[], covered: number, score: number) {
    if (idx === perChild.length) {
      if (covered > bestCovered || (covered === bestCovered && score > bestScore)) {
        bestCovered = covered;
        bestScore = score;
        bestAssignment = [...current];
      }
      return;
    }
    for (const el of eligible[idx] ?? []) {
      if (used.has(el.dim.key)) continue;
      used.add(el.dim.key);
      current[idx] = el;
      search(idx + 1, used, current, covered + 1, score + el.value);
      used.delete(el.dim.key);
      current[idx] = null;
    }
    // Always also try "skip" so this child takes the fallback card. Two
    // reasons: (a) when the child has no eligible dims at all, this is the
    // only path forward; (b) when their eligible dims are all already taken
    // by earlier siblings, we still need to terminate this branch at a leaf;
    // (c) sometimes voluntarily giving up a dim frees a sibling for theirs.
    current[idx] = null;
    search(idx + 1, used, current, covered, score);
  }
  search(0, new Set(), perChild.map(() => null), 0, 0);

  const highlights: SiblingHighlight[] = perChild.map((child, idx) => {
    const isInactive = child.routinesCount === 0 && child.behaviorsCount === 0;
    if (isInactive) {
      return {
        childId: child.childId,
        childName: child.childName,
        headline: "Quiet week",
        detail: `No routines or moments yet — even a few minutes together this week would make a difference.`,
        icon: "sparkles",
        accent: brandPurple,
      };
    }
    const pick = bestAssignment[idx];
    if (pick) {
      return {
        childId: child.childId,
        childName: child.childName,
        headline: pick.dim.headline,
        detail: pick.dim.detail(child),
        icon: pick.dim.icon,
        accent: pick.dim.accent,
      };
    }
    return {
      childId: child.childId,
      childName: child.childName,
      headline: "Steady & curious",
      detail: child.topCategory
        ? `Showed up across ${child.activeDays || 1} day${child.activeDays === 1 ? "" : "s"}, leaning into ${child.topCategory}.`
        : `Showed up this period — every entry helps Amy spot patterns.`,
      icon: "sparkles",
      accent: brandPurple,
    };
  });

  return highlights;
}

const brandPurple = "#8B5CF6";

export async function buildInsights(args: {
  userId: string;
  range: InsightsRange;
}): Promise<InsightsResponse> {
  const { userId, range } = args;
  const periodDays = range === "month" ? 30 : 7;
  const currentEnd = daysAgoIso(-1);
  const currentStart = daysAgoIso(periodDays - 1);
  const previousEnd = currentStart;
  const previousStart = daysAgoIso(periodDays * 2 - 1);

  const children = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  const childIds = children.map((c) => c.id);
  const hasChildren = childIds.length > 0;

  if (!hasChildren) {
    return {
      range,
      generatedAt: new Date().toISOString(),
      hasChildren: false,
      hasActivity: false,
      emptyReason: "no_children",
      summary: {
        routinesThisPeriod: 0,
        routinesPreviousPeriod: 0,
        routinesChangePct: 0,
        behaviorsThisPeriod: 0,
        behaviorsPreviousPeriod: 0,
        positiveRateThisPeriod: 0,
        positiveRatePreviousPeriod: 0,
        positiveRateChangePts: 0,
      },
      perChild: [],
      siblingHighlights: [],
      activityMix: [],
      dayOfWeek: emptyDayOfWeek(),
      timeOfDay: { morning: 0, afternoon: 0, evening: 0 },
      behaviorTypes: { positive: 0, negative: 0, neutral: 0, milestone: 0 },
    };
  }

  const [allRoutines, allBehaviors] = await Promise.all([
    db.select().from(routinesTable).where(inArray(routinesTable.childId, childIds)),
    db.select().from(behaviorsTable).where(inArray(behaviorsTable.childId, childIds)),
  ]);

  const routinesThisPeriod = allRoutines.filter((r) => {
    const d = isoDay(r.createdAt);
    return d >= currentStart && d < currentEnd;
  });
  const routinesPreviousPeriod = allRoutines.filter((r) => {
    const d = isoDay(r.createdAt);
    return d >= previousStart && d < previousEnd;
  });

  const behaviorsThisPeriod = allBehaviors.filter(
    (b) => b.date >= currentStart && b.date < currentEnd,
  );
  const behaviorsPreviousPeriod = allBehaviors.filter(
    (b) => b.date >= previousStart && b.date < previousEnd,
  );

  const positiveCountThis = behaviorsThisPeriod.filter((b) => b.type === "positive").length;
  const positiveCountPrev = behaviorsPreviousPeriod.filter((b) => b.type === "positive").length;
  const positiveRateThis = behaviorsThisPeriod.length
    ? Math.round((positiveCountThis / behaviorsThisPeriod.length) * 100)
    : 0;
  const positiveRatePrev = behaviorsPreviousPeriod.length
    ? Math.round((positiveCountPrev / behaviorsPreviousPeriod.length) * 100)
    : 0;

  const perChild: PerChildInsights[] = children.map((child) => {
    const childRoutines = routinesThisPeriod.filter((r) => r.childId === child.id);
    const childBehaviors = behaviorsThisPeriod.filter((b) => b.childId === child.id);
    const childPositive = childBehaviors.filter((b) => b.type === "positive").length;
    const childMilestones = childBehaviors.filter((b) => b.type === "milestone").length;

    let totalItems = 0;
    let completedItems = 0;
    let morningItems = 0;
    let eveningItems = 0;
    const childCategoryCounts = new Map<string, number>();
    for (const routine of childRoutines) {
      const items = (routine.items as RoutineItem[] | null) ?? [];
      for (const item of items) {
        totalItems += 1;
        const status = (item as { status?: string }).status;
        if (status === "completed") completedItems += 1;
        const cat = item.category || "Other";
        childCategoryCounts.set(cat, (childCategoryCounts.get(cat) ?? 0) + 1);
        const bucket = timeBucketFor(item.time ?? "");
        if (bucket === "morning") morningItems += 1;
        if (bucket === "evening") eveningItems += 1;
      }
    }

    const topCategory =
      Array.from(childCategoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const activeDaySet = new Set<string>();
    for (const r of childRoutines) activeDaySet.add(isoDay(r.createdAt));
    for (const b of childBehaviors) activeDaySet.add(b.date);

    return {
      childId: child.id,
      childName: child.name,
      routinesCount: childRoutines.length,
      behaviorsCount: childBehaviors.length,
      positiveCount: childPositive,
      positiveRate: childBehaviors.length
        ? Math.round((childPositive / childBehaviors.length) * 100)
        : 0,
      routineCompletionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      topCategory,
      milestoneCount: childMilestones,
      activeDays: activeDaySet.size,
      morningCount: morningItems,
      eveningCount: eveningItems,
      categoryVariety: childCategoryCounts.size,
    };
  });

  const siblingHighlights = buildSiblingHighlights(perChild);

  const categoryCounts = new Map<string, number>();
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0 };
  for (const routine of routinesThisPeriod) {
    const items = (routine.items as RoutineItem[] | null) ?? [];
    for (const item of items) {
      const cat = item.category || "Other";
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      const bucket = timeBucketFor(item.time ?? "");
      timeOfDay[bucket] += 1;
    }
  }
  const activityMix = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const dayCounts = new Array(7).fill(0) as number[];
  for (const r of routinesThisPeriod) {
    dayCounts[new Date(r.createdAt).getDay()] += 1;
  }
  for (const b of behaviorsThisPeriod) {
    dayCounts[new Date(b.date + "T00:00:00").getDay()] += 1;
  }
  const dayOfWeek = DAY_LABELS.map((day, i) => ({ day, count: dayCounts[i] ?? 0 }));

  const behaviorTypes = {
    positive: behaviorsThisPeriod.filter((b) => b.type === "positive").length,
    negative: behaviorsThisPeriod.filter((b) => b.type === "negative").length,
    neutral: behaviorsThisPeriod.filter((b) => b.type === "neutral").length,
    milestone: behaviorsThisPeriod.filter((b) => b.type === "milestone").length,
  };

  const hasActivity = routinesThisPeriod.length > 0 || behaviorsThisPeriod.length > 0;

  return {
    range,
    generatedAt: new Date().toISOString(),
    hasChildren: true,
    hasActivity,
    emptyReason: hasActivity ? null : "no_activity",
    summary: {
      routinesThisPeriod: routinesThisPeriod.length,
      routinesPreviousPeriod: routinesPreviousPeriod.length,
      routinesChangePct: pctChange(routinesThisPeriod.length, routinesPreviousPeriod.length),
      behaviorsThisPeriod: behaviorsThisPeriod.length,
      behaviorsPreviousPeriod: behaviorsPreviousPeriod.length,
      positiveRateThisPeriod: positiveRateThis,
      positiveRatePreviousPeriod: positiveRatePrev,
      positiveRateChangePts: positiveRateThis - positiveRatePrev,
    },
    perChild,
    siblingHighlights,
    activityMix,
    dayOfWeek,
    timeOfDay,
    behaviorTypes,
  };
}
