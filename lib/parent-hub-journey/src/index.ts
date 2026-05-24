/**
 * Parent Hub 3-day guided journey — shared constants + path builder.
 * Used by api-server and kidschedule.
 */

export const HUB_JOURNEY_FREE_DAYS = 3;
export const HUB_JOURNEY_CALENDAR_CAP_DAYS = 7;

/** Hub features that stay accessible after free journey ends. */
export const HUB_JOURNEY_EXEMPT_FEATURES = [
  "hub_ptm_prep",
  "hub_emotional",
] as const;

export type HubJourneyExemptFeature = (typeof HUB_JOURNEY_EXEMPT_FEATURES)[number];

export type PathStepKind =
  | "parent_tip"
  | "life_skill"
  | "learning"
  | "article"
  | "summary";

export interface PathStep {
  id: string;
  kind: PathStepKind;
  emoji: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface PeekAheadItem {
  emoji: string;
  title: string;
  body: string;
  locked: boolean;
}

export interface ChildProgressSnapshot {
  lifeSkillsDone: number;
  lifeSkillsStreak: number;
  consistencyDays: number;
  levelLabel: string | null;
  summaryLine: string;
}

export interface HubJourneyAccess {
  isPremium: boolean;
  /** True while user still has free journey days remaining and calendar not expired. */
  isFreePeriod: boolean;
  /** True when free period ended — hub tiles should lock (except exempt). */
  isLocked: boolean;
  lockReason: "none" | "completed" | "expired" | "premium";
  daysCompleted: number;
  daysTotal: number;
  currentDay: number;
  calendarDaysLeft: number;
  calendarDeadline: string;
}

export function formatDateIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function normaliseCompletedDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is number =>
      typeof n === "number" && n >= 1 && n <= HUB_JOURNEY_FREE_DAYS,
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function seededPick<T>(pool: T[], seed: string): T | null {
  if (pool.length === 0) return null;
  return pool[hashStr(seed) % pool.length] ?? null;
}

export function computeHubJourneyAccess(opts: {
  isPremium: boolean;
  completedDays: number[];
  startedAt: Date;
  now?: Date;
}): HubJourneyAccess {
  const now = opts.now ?? new Date();
  if (opts.isPremium) {
    return {
      isPremium: true,
      isFreePeriod: false,
      isLocked: false,
      lockReason: "premium",
      daysCompleted: opts.completedDays.length,
      daysTotal: HUB_JOURNEY_FREE_DAYS,
      currentDay: Math.min(opts.completedDays.length + 1, HUB_JOURNEY_FREE_DAYS),
      calendarDaysLeft: HUB_JOURNEY_CALENDAR_CAP_DAYS,
      calendarDeadline: new Date(
        opts.startedAt.getTime() + HUB_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
      ).toISOString(),
    };
  }

  const completed = normaliseCompletedDays(opts.completedDays);
  const deadline = new Date(
    opts.startedAt.getTime() + HUB_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
  );
  const msLeft = deadline.getTime() - now.getTime();
  const calendarDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const expired = msLeft <= 0 && completed.length < HUB_JOURNEY_FREE_DAYS;
  const allDone = completed.length >= HUB_JOURNEY_FREE_DAYS;
  const isLocked = allDone || expired;
  const currentDay = allDone
    ? HUB_JOURNEY_FREE_DAYS + 1
    : Math.min(completed.length + 1, HUB_JOURNEY_FREE_DAYS);

  return {
    isPremium: false,
    isFreePeriod: !isLocked,
    isLocked,
    lockReason: allDone ? "completed" : expired ? "expired" : "none",
    daysCompleted: completed.length,
    daysTotal: HUB_JOURNEY_FREE_DAYS,
    currentDay,
    calendarDaysLeft,
    calendarDeadline: deadline.toISOString(),
  };
}

export function isHubFeatureExempt(featureId: string): boolean {
  return (HUB_JOURNEY_EXEMPT_FEATURES as readonly string[]).includes(featureId);
}

export function bonusUnlockForDay(day: number): string | null {
  if (day === 1) return "hub_activities";
  if (day === 2) return "hub_articles";
  if (day === 3) return "hub_olympiad";
  return null;
}

export interface BuildPathInput {
  journeyDay: number;
  dateIso: string;
  childId: number | string;
  childName: string;
  ageYears: number;
  ageMonths: number;
  /** Parent tip text (pre-resolved by caller). */
  parentTip: string;
  /** Life skill task title + body — omit for infants. */
  lifeSkill?: { id: string; title: string; body: string } | null;
  /** Learning activity line. */
  learning: { emoji: string; title: string; body: string; href?: string };
  /** Article of the day (day 3). */
  article?: { title: string; summary: string } | null;
  /** Amy summary line built from progress. */
  summaryLine?: string;
}

export function buildTodaysPath(input: BuildPathInput): PathStep[] {
  const steps: PathStep[] = [
    {
      id: `tip-${input.journeyDay}`,
      kind: "parent_tip",
      emoji: "💡",
      title: "Parent tip",
      body: input.parentTip,
    },
  ];

  if (input.lifeSkill && input.ageYears >= 2) {
    steps.push({
      id: `skill-${input.lifeSkill.id}`,
      kind: "life_skill",
      emoji: "🌟",
      title: "Life skill",
      body: `${input.lifeSkill.title} — ${input.lifeSkill.body}`,
      ctaLabel: "Open Life Skills",
      ctaHref: "/parenting-hub#hub-group-support",
    });
  }

  steps.push({
    id: `learn-${input.journeyDay}`,
    kind: "learning",
    emoji: input.learning.emoji,
    title: input.learning.title,
    body: input.learning.body,
    ctaHref: input.learning.href,
  });

  if (input.journeyDay >= 2 && input.article) {
    steps.push({
      id: `article-${input.dateIso}`,
      kind: "article",
      emoji: "📚",
      title: "Article of the day",
      body: `${input.article.title} — ${input.article.summary}`,
      ctaLabel: "Read article",
      ctaHref: "/parenting-hub#hub-group-support",
    });
  }

  if (input.journeyDay >= 3 && input.summaryLine) {
    steps.push({
      id: `summary-${input.journeyDay}`,
      kind: "summary",
      emoji: "✨",
      title: `${input.childName}'s progress`,
      body: input.summaryLine,
    });
  }

  return steps;
}

export function buildPeekAhead(input: {
  nextJourneyDay: number;
  dateIso: string;
  childName: string;
  childKey: string | number;
}): PeekAheadItem[] {
  const tomorrow = new Date(input.dateIso);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatDateIso(tomorrow);
  const seed = `${tomorrowIso}:${input.childKey}:${input.nextJourneyDay}`;

  const pool: PeekAheadItem[] = [
    { emoji: "🧩", title: "New daily puzzle", body: `Fresh brain teaser for ${input.childName}`, locked: true },
    { emoji: "🌟", title: "New life skill", body: "Tomorrow's habit-building task", locked: true },
    { emoji: "📖", title: "New story", body: "Age-matched story time pick", locked: true },
    { emoji: "🔤", title: "Phonics practice", body: "New sounds to explore", locked: true },
  ];

  const pick = seededPick(pool, seed);
  return pick ? [pick] : pool.slice(0, 2);
}

export function buildDefaultSummaryLine(
  childName: string,
  snapshot: Partial<ChildProgressSnapshot>,
): string {
  const parts: string[] = [];
  if (snapshot.lifeSkillsDone && snapshot.lifeSkillsDone > 0) {
    parts.push(`${snapshot.lifeSkillsDone} life skill${snapshot.lifeSkillsDone > 1 ? "s" : ""} practiced`);
  }
  if (snapshot.lifeSkillsStreak && snapshot.lifeSkillsStreak > 0) {
    parts.push(`${snapshot.lifeSkillsStreak}-day streak`);
  }
  if (snapshot.levelLabel) {
    parts.push(snapshot.levelLabel);
  }
  if (parts.length === 0) {
    return `${childName} is just getting started — keep going tomorrow for new activities!`;
  }
  return `${childName} ${parts.join(", ")}. Great momentum — unlock tomorrow's Path to continue!`;
}

export function isHubJourneyFeatureLocked(
  featureId: string,
  access: HubJourneyAccess,
  bonusUnlocks: string[],
): boolean {
  if (access.isPremium || access.isFreePeriod) return false;
  if (bonusUnlocks.includes(featureId)) return false;
  if (isHubFeatureExempt(featureId)) return false;
  if (!featureId.startsWith("hub_")) return false;
  return access.isLocked;
}
