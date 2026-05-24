import {
  buildPhonicsJourneyMeta,
  buildPhonicsPremiumMeta,
  capPhonicsCatalog,
  capPhonicsPremiumCatalog,
  computeHubJourneyAccess,
  computePhonicsDripDay,
  pickPhonicsDailyItems,
  phonicsPremiumItemLimit,
  type PhonicsJourneyMeta,
  type PhonicsPremiumMeta,
} from "@workspace/parent-hub-journey";

export type { PhonicsJourneyMeta, PhonicsPremiumMeta };

function todaySeedUtc(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export interface ApplyPhonicsCapResult<T> {
  items: T[];
  dailyItems: T[];
  journeyMeta: PhonicsJourneyMeta;
  premiumMeta: PhonicsPremiumMeta | null;
}

/**
 * Applies free journey cap OR premium drip cap (client guard when API omits meta).
 */
export function applyPhonicsJourneyCap<T>(
  allItems: T[],
  dailyItems: T[],
  opts: {
    isPremium: boolean;
    journeyDay: number;
    isFreePeriod: boolean;
    isJourneyLocked: boolean;
    apiMeta?: PhonicsJourneyMeta | null;
    premiumMeta?: PhonicsPremiumMeta | null;
    totalCatalog?: number;
    journeyStartedAt?: Date;
    completedDays?: number[];
    /** Local progress for drip fallback when premiumMeta missing. */
    localPlayDays?: number;
  },
): ApplyPhonicsCapResult<T> {
  const totalCatalog = opts.totalCatalog ?? allItems.length;

  if (opts.isPremium) {
    const premiumMeta =
      opts.premiumMeta ??
      buildPhonicsPremiumMeta({
        dripDay: Math.max(1, opts.localPlayDays ?? 1),
        activePracticeDays: Math.max(0, (opts.localPlayDays ?? 1) - 1),
        totalCatalog,
      });

    const expectedLimit = premiumMeta.itemLimit;
    const items =
      allItems.length <= expectedLimit
        ? allItems
        : capPhonicsPremiumCatalog(allItems, premiumMeta.dripDay);

    const nextDaily = pickPhonicsDailyItems(items, todaySeedUtc(), 10);

    const journeyMeta: PhonicsJourneyMeta =
      opts.apiMeta ??
      buildPhonicsJourneyMeta({
        isPremium: true,
        access: computeHubJourneyAccess({
          isPremium: true,
          completedDays: opts.completedDays ?? [],
          startedAt: opts.journeyStartedAt ?? new Date(),
        }),
        journeyDay: opts.journeyDay,
        totalCatalog,
      });

    journeyMeta.itemLimit = premiumMeta.itemLimit;
    journeyMeta.lockedCount = premiumMeta.lockedCount;
    journeyMeta.unlocksTomorrow = premiumMeta.unlocksTomorrow;

    return {
      items,
      dailyItems:
        dailyItems.length > 0 && dailyItems.length <= items.length
          ? dailyItems
          : nextDaily.length > 0
            ? nextDaily
            : items.slice(0, Math.min(10, items.length)),
      journeyMeta,
      premiumMeta,
    };
  }

  const access =
    opts.apiMeta != null
      ? {
          isPremium: false,
          isFreePeriod: opts.apiMeta.isFreePeriod,
          isLocked: opts.apiMeta.isLocked,
          lockReason: opts.apiMeta.isLocked ? ("completed" as const) : ("none" as const),
          daysCompleted: 0,
          daysTotal: 3,
          currentDay: opts.journeyDay,
          calendarDaysLeft: 7,
          calendarDeadline: new Date().toISOString(),
        }
      : computeHubJourneyAccess({
          isPremium: false,
          completedDays: opts.completedDays ?? [],
          startedAt: opts.journeyStartedAt ?? new Date(),
        });

  const journeyMeta =
    opts.apiMeta ??
    buildPhonicsJourneyMeta({
      isPremium: false,
      access,
      journeyDay: opts.journeyDay,
      totalCatalog,
    });

  if (journeyMeta.isLocked || !opts.isFreePeriod) {
    return { items: [], dailyItems: [], journeyMeta, premiumMeta: null };
  }

  const expectedLimit = journeyMeta.itemLimit;
  const items =
    allItems.length <= expectedLimit
      ? allItems
      : capPhonicsCatalog(allItems, opts.journeyDay);

  const nextDaily = pickPhonicsDailyItems(items, todaySeedUtc(), 10);

  return {
    items,
    dailyItems:
      nextDaily.length > 0 ? nextDaily : items.slice(0, Math.min(10, items.length)),
    journeyMeta,
    premiumMeta: null,
  };
}

/** Premium practice grid uses daily rotation, not the full unlocked library. */
export function premiumPracticeItems<T>(dailyItems: T[], unlockedItems: T[]): T[] {
  if (dailyItems.length > 0) return dailyItems;
  return unlockedItems.slice(0, Math.min(10, unlockedItems.length));
}

export { phonicsPremiumItemLimit, computePhonicsDripDay, buildPhonicsPremiumMeta };
