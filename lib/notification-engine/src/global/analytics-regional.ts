import type { HistoryEntry } from "../types.js";
import type { CulturalRegion, SupportedLocale } from "./locales.js";

export interface RegionalAnalyticsSummary {
  windowDays: number;
  byCountry: Array<{ countryCode: string; sent: number; opened: number; openRate: number }>;
  byLocale: Array<{ locale: SupportedLocale; sent: number; opened: number; openRate: number }>;
  byTimezone: Array<{ timezone: string; sent: number; opened: number; openRate: number }>;
  byCategory: Array<{ category: string; sent: number; opened: number; openRate: number }>;
  openRateHeatmap: Array<{ hour: number; opens: number; sent: number }>;
  culturalContentPerformance: Array<{ region: CulturalRegion; sent: number; opened: number; openRate: number }>;
}

export function computeRegionalAnalytics(
  entries: Array<
    HistoryEntry & {
      countryCode?: string | null;
      locale?: string | null;
      timezone?: string | null;
      culturalRegion?: CulturalRegion | null;
    }
  >,
  windowDays = 30,
  now = new Date(),
): RegionalAnalyticsSummary {
  const cutoff = now.getTime() - windowDays * 86400000;
  const recent = entries.filter((e) => e.sentAt.getTime() >= cutoff);

  return {
    windowDays,
    byCountry: aggregateBy(recent, "countryCode", (e) => e.countryCode ?? "unknown"),
    byLocale: aggregateBy(recent, "locale", (e) => (e.locale ?? "en-US") as SupportedLocale),
    byTimezone: aggregateBy(recent, "timezone", (e) => e.timezone ?? "unknown"),
    byCategory: aggregateBy(recent, "category", (e) => e.category),
    openRateHeatmap: heatmapByHour(recent),
    culturalContentPerformance: aggregateBy(
      recent,
      "region",
      (e) => (e.culturalRegion ?? "south_asia") as CulturalRegion,
    ),
  };
}

type RegionalEntry = HistoryEntry & {
  countryCode?: string | null;
  locale?: string | null;
  timezone?: string | null;
  culturalRegion?: CulturalRegion | null;
};

function aggregateBy<K extends string, V extends string>(
  entries: RegionalEntry[],
  dimension: K,
  keyFn: (e: RegionalEntry) => V,
): Array<Record<K, V> & { sent: number; opened: number; openRate: number }> {
  const map = new Map<V, { sent: number; opened: number }>();
  for (const e of entries) {
    const k = keyFn(e);
    const cur = map.get(k) ?? { sent: 0, opened: 0 };
    cur.sent++;
    if (e.openedAt) cur.opened++;
    map.set(k, cur);
  }
  return [...map.entries()].map(([value, stats]) => ({
    [dimension]: value,
    sent: stats.sent,
    opened: stats.opened,
    openRate: stats.sent > 0 ? stats.opened / stats.sent : 0,
  })) as Array<Record<K, V> & { sent: number; opened: number; openRate: number }>;
}

function heatmapByHour(
  entries: HistoryEntry[],
): Array<{ hour: number; opens: number; sent: number }> {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, opens: 0, sent: 0 }));
  for (const e of entries) {
    const h = e.sentAt.getUTCHours();
    buckets[h]!.sent++;
    if (e.openedAt) buckets[h]!.opens++;
  }
  return buckets;
}
