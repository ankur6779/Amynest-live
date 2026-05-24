/**
 * Parent Hub 3-day guided journey — shared constants + path builder.
 * Used by api-server and kidschedule.
 */

export const HUB_JOURNEY_FREE_DAYS = 3;
export const HUB_JOURNEY_CALENDAR_CAP_DAYS = 7;

/** Free-user content quotas for Parent Hub modules (shared client + server). */
export const HUB_CONTENT_QUOTAS = {
  storyHubLifetimeVideos: 5,
  artCraftLifetimeVideos: 10,
  worksheetDaily: 2,
  worksheetLifetime: 6,
  coloringDaily: 2,
  coloringLifetime: 6,
  funsheetDaily: 2,
  funsheetLifetime: 6,
  speechCoachSessions: 3,
  /** Daily download cap for premium users (worksheets, coloring, fun sheets). */
  premiumDownloadDaily: 5,
} as const;

/** Per-section lifetime sub-item caps (Story Hub, Art & Craft reels). */
export const SECTION_LIFETIME_LIMITS: Record<string, number> = {
  hub_story_hub: HUB_CONTENT_QUOTAS.storyHubLifetimeVideos,
  hub_art_craft: HUB_CONTENT_QUOTAS.artCraftLifetimeVideos,
};

export const DEFAULT_SECTION_LIFETIME_LIMIT = 2;

export function getSectionLifetimeLimit(sectionId: string): number {
  return SECTION_LIFETIME_LIMITS[sectionId] ?? DEFAULT_SECTION_LIFETIME_LIMIT;
}

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

/** True when child is in the 0–24 month infant window. */
export function isInfantAgeMonths(totalMonths: number): boolean {
  return totalMonths < 24;
}

export function bonusUnlockForDay(
  day: number,
  opts?: { isInfant?: boolean },
): string | null {
  if (day === 1) return "hub_activities";
  if (day === 2) return "hub_articles";
  if (day === 3) return opts?.isInfant ? "hub_infant_parenting" : "hub_olympiad";
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
  isInfant?: boolean;
}): PeekAheadItem[] {
  const tomorrow = new Date(input.dateIso);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatDateIso(tomorrow);
  const seed = `${tomorrowIso}:${input.childKey}:${input.nextJourneyDay}`;

  const pool: PeekAheadItem[] = input.isInfant
    ? [
        {
          emoji: "💤",
          title: "Sleep window tip",
          body: `Tomorrow's nap timing guidance for ${input.childName}`,
          locked: true,
        },
        {
          emoji: "🍼",
          title: "Feeding guide",
          body: "Age-matched feeding intervals and tips",
          locked: true,
        },
        {
          emoji: "👶",
          title: "Baby cue insight",
          body: "Understand cries and comfort signals",
          locked: true,
        },
        {
          emoji: "📈",
          title: "Milestone check",
          body: "What to watch for this month",
          locked: true,
        },
      ]
    : [
        {
          emoji: "🧩",
          title: "New daily puzzle",
          body: `Fresh brain teaser for ${input.childName}`,
          locked: true,
        },
        {
          emoji: "🌟",
          title: "New life skill",
          body: "Tomorrow's habit-building task",
          locked: true,
        },
        {
          emoji: "📖",
          title: "New story",
          body: "Age-matched story time pick",
          locked: true,
        },
        {
          emoji: "🔤",
          title: "Phonics practice",
          body: "New sounds to explore",
          locked: true,
        },
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

// ─── Phonics ↔ 3-day journey alignment ───────────────────────────────────────

/** Max catalog items visible per hub journey day (free users). */
export const PHONICS_JOURNEY_ITEM_LIMITS: Record<1 | 2 | 3, number> = {
  1: 4,
  2: 8,
  3: 10,
};

export interface PhonicsJourneyMeta {
  journeyDay: number;
  itemLimit: number;
  totalCatalog: number;
  lockedCount: number;
  /** Extra sounds unlocked when the user completes the next journey day. */
  unlocksTomorrow: number;
  isPremium: boolean;
  isFreePeriod: boolean;
  isLocked: boolean;
  /** Sub-item IDs unlocked for the current journey day. */
  unlockedSubItems: string[];
}

/** Phonics sub-sections unlocked cumulatively by journey day. */
export const PHONICS_SUBITEMS_BY_JOURNEY_DAY: Record<1 | 2 | 3, readonly string[]> = {
  1: ["phonics_todays_activity", "phonics_practice_sounds"],
  2: [
    "phonics_todays_activity",
    "phonics_practice_sounds",
    "phonics_progress",
  ],
  3: [
    "phonics_todays_activity",
    "phonics_practice_sounds",
    "phonics_progress",
    "phonics_test",
    "phonics_parent_tips",
    "phonics_download",
  ],
};

export function phonicsItemLimitForJourneyDay(journeyDay: number): number {
  if (journeyDay <= 1) return PHONICS_JOURNEY_ITEM_LIMITS[1];
  if (journeyDay <= 2) return PHONICS_JOURNEY_ITEM_LIMITS[2];
  return PHONICS_JOURNEY_ITEM_LIMITS[3];
}

export function phonicsUnlocksTomorrow(journeyDay: number): number {
  if (journeyDay >= 3) return 0;
  const next = phonicsItemLimitForJourneyDay(journeyDay + 1);
  const cur = phonicsItemLimitForJourneyDay(journeyDay);
  return Math.max(0, next - cur);
}

export function phonicsUnlockedSubItems(journeyDay: number): string[] {
  const day = Math.min(Math.max(1, journeyDay), 3) as 1 | 2 | 3;
  return [...PHONICS_SUBITEMS_BY_JOURNEY_DAY[day]];
}

export function isPhonicsSubItemUnlocked(
  subItemId: string,
  journeyDay: number,
): boolean {
  return phonicsUnlockedSubItems(journeyDay).includes(subItemId);
}

/** First journey day when a sub-item becomes available (for lock messaging). */
export function phonicsSubItemUnlockDay(subItemId: string): number | null {
  for (const day of [1, 2, 3] as const) {
    if (PHONICS_SUBITEMS_BY_JOURNEY_DAY[day].includes(subItemId)) return day;
  }
  return null;
}

export function capPhonicsCatalog<T>(allItems: T[], journeyDay: number): T[] {
  const limit = phonicsItemLimitForJourneyDay(journeyDay);
  return allItems.slice(0, limit);
}

/** Deterministic daily slice from a capped pool (matches api-server phonics route). */
export function pickPhonicsDailyItems<T>(
  pool: T[],
  todaySeed: number,
  dailyLimit = 10,
): T[] {
  if (pool.length === 0) return [];
  if (pool.length <= dailyLimit) return pool;
  return Array.from(
    { length: dailyLimit },
    (_, i) => pool[(todaySeed + i) % pool.length]!,
  );
}

export function buildPhonicsJourneyMeta(opts: {
  isPremium: boolean;
  access: HubJourneyAccess;
  journeyDay: number;
  totalCatalog: number;
}): PhonicsJourneyMeta {
  const { isPremium, access, journeyDay, totalCatalog } = opts;
  if (isPremium) {
    return {
      journeyDay,
      itemLimit: totalCatalog,
      totalCatalog,
      lockedCount: 0,
      unlocksTomorrow: 0,
      isPremium: true,
      isFreePeriod: false,
      isLocked: false,
      unlockedSubItems: [...PHONICS_SUBITEMS_BY_JOURNEY_DAY[3]],
    };
  }
  const itemLimit = access.isFreePeriod
    ? phonicsItemLimitForJourneyDay(journeyDay)
    : 0;
  return {
    journeyDay,
    itemLimit,
    totalCatalog,
    lockedCount: Math.max(0, totalCatalog - itemLimit),
    unlocksTomorrow: access.isFreePeriod ? phonicsUnlocksTomorrow(journeyDay) : 0,
    isPremium: false,
    isFreePeriod: access.isFreePeriod,
    isLocked: access.isLocked,
    unlockedSubItems: access.isFreePeriod
      ? phonicsUnlockedSubItems(journeyDay)
      : [],
  };
}

// ─── Premium drip — progressive catalog unlock ───────────────────────────────

/** Per-day unlock increments (cumulative). Day 1=6, day 2=+4, day 3=+5, then +4. */
export const PHONICS_PREMIUM_DRIP_INCREMENTS = [6, 4, 5] as const;
export const PHONICS_PREMIUM_DRIP_DEFAULT_INCREMENT = 4;

export interface PhonicsPremiumMeta {
  dripDay: number;
  itemLimit: number;
  totalCatalog: number;
  lockedCount: number;
  unlocksTomorrow: number;
  /** Distinct calendar days with at least one play recorded. */
  activePracticeDays: number;
}

export function phonicsPremiumItemLimit(
  dripDay: number,
  totalCatalog: number,
): number {
  const d = Math.max(1, dripDay);
  let cap = 0;
  for (let day = 1; day <= d; day++) {
    if (day === 1) cap += PHONICS_PREMIUM_DRIP_INCREMENTS[0];
    else if (day === 3) cap += PHONICS_PREMIUM_DRIP_INCREMENTS[2];
    else cap += PHONICS_PREMIUM_DRIP_INCREMENTS[1] ?? PHONICS_PREMIUM_DRIP_DEFAULT_INCREMENT;
  }
  return Math.min(totalCatalog, cap);
}

export function phonicsPremiumUnlocksTomorrow(
  dripDay: number,
  totalCatalog: number,
): number {
  const cur = phonicsPremiumItemLimit(dripDay, totalCatalog);
  const next = phonicsPremiumItemLimit(dripDay + 1, totalCatalog);
  return Math.max(0, next - cur);
}

/** Count practice-active calendar days; opening on a new day advances the drip tier. */
export function computePhonicsDripDay(
  progressRows: Array<{
    playCount: number;
    firstPlayedAt?: Date | string | null;
    lastPlayedAt?: Date | string | null;
  }>,
  now: Date = new Date(),
): { dripDay: number; activePracticeDays: number } {
  const activeDates = new Set<string>();
  for (const p of progressRows) {
    if (p.playCount <= 0) continue;
    if (p.firstPlayedAt) {
      const d = new Date(p.firstPlayedAt);
      if (Number.isFinite(d.getTime())) activeDates.add(formatDateIso(d));
    }
    if (p.lastPlayedAt) {
      const d = new Date(p.lastPlayedAt);
      if (Number.isFinite(d.getTime())) activeDates.add(formatDateIso(d));
    }
  }
  const today = formatDateIso(now);
  const activePracticeDays = activeDates.size;
  if (activePracticeDays === 0) {
    return { dripDay: 1, activePracticeDays: 0 };
  }
  if (activeDates.has(today)) {
    return { dripDay: activePracticeDays, activePracticeDays };
  }
  return { dripDay: activePracticeDays + 1, activePracticeDays };
}

export function capPhonicsPremiumCatalog<T>(
  allItems: T[],
  dripDay: number,
): T[] {
  const limit = phonicsPremiumItemLimit(dripDay, allItems.length);
  return allItems.slice(0, limit);
}

export function buildPhonicsPremiumMeta(opts: {
  dripDay: number;
  activePracticeDays: number;
  totalCatalog: number;
}): PhonicsPremiumMeta {
  const itemLimit = phonicsPremiumItemLimit(opts.dripDay, opts.totalCatalog);
  return {
    dripDay: opts.dripDay,
    itemLimit,
    totalCatalog: opts.totalCatalog,
    lockedCount: Math.max(0, opts.totalCatalog - itemLimit),
    unlocksTomorrow: phonicsPremiumUnlocksTomorrow(opts.dripDay, opts.totalCatalog),
    activePracticeDays: opts.activePracticeDays,
  };
}
