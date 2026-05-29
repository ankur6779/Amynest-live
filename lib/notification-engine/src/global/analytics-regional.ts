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
    byCountry: aggregate(recent, (e) => e.countryCode ?? "unknown"),
    byLocale: aggregate(recent, (e) => (e.locale ?? "en-US") as SupportedLocale),
    byTimezone: aggregate(recent, (e) => e.timezone ?? "unknown"),
    byCategory: aggregate(recent, (e) => e.category),
    openRateHeatmap: heatmapByHour(recent),
    culturalContentPerformance: aggregate(
      recent,
      (e) => (e.culturalRegion ?? "south_asia") as CulturalRegion,
    ),
  };
}

function aggregate<T extends string>(
  entries: Array<HistoryEntry & Record<string, unknown>>,
  keyFn: (e: (typeof entries)[0]) => T,
): Array<{ [k: string]: string | number; sent: number; opened: number; openRate: number }> {
  const map = new Map<T, { sent: number; opened: number }>();
  for (const e of entries) {
    const k = keyFn(e);
    const cur = map.get(k) ?? { sent: 0, opened: 0 };
    cur.sent++;
    if (e.openedAt) cur.opened++;
    map.set(k, cur);
  }
  return [...map.entries()].map(([key, v]) => ({
    key,
    sent: v.sent,
    opened: v.opened,
    openRate: v.sent > 0 ? v.opened / v.sent : 0,
  })) as Array<{ sent: number; opened: number; openRate: number } & Record<string, string | number>>;
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
