import type { HistoryEntry } from "./types.js";

export interface CategoryAnalytics {
  category: string;
  sent: number;
  opened: number;
  dismissed: number;
  openRate: number;
  dismissRate: number;
}

export interface ContentTypeAnalytics {
  contentType: string;
  sent: number;
  opened: number;
  openRate: number;
}

export interface NotificationAnalyticsSummary {
  totalSent: number;
  totalOpened: number;
  totalDismissed: number;
  openRate: number;
  dismissRate: number;
  repeatContentIndicators: number;
  fatigueIndicators: {
    consecutiveIgnores: number;
    rollingIgnores30d: number;
    highValueOnly: boolean;
  };
  byCategory: CategoryAnalytics[];
  byContentType: ContentTypeAnalytics[];
}

export function computeAnalytics(
  entries: HistoryEntry[],
  fatigue: { consecutiveIgnores: number; rollingIgnores30d: number; highValueOnly: boolean },
  windowDays = 30,
  now = new Date(),
): NotificationAnalyticsSummary {
  const cutoff = now.getTime() - windowDays * 86400000;
  const recent = entries.filter((e) => e.sentAt.getTime() >= cutoff);

  const sent = recent.length;
  const opened = recent.filter((e) => e.openedAt).length;
  const dismissed = recent.filter((e) => e.dismissedAt).length;

  const byCategory = aggregateByCategory(recent);
  const byContentType = aggregateByContentType(recent);

  const hashCounts = new Map<string, number>();
  for (const e of recent) {
    if (!e.contentHash) continue;
    hashCounts.set(e.contentHash, (hashCounts.get(e.contentHash) ?? 0) + 1);
  }
  const repeatContentIndicators = [...hashCounts.values()].filter((c) => c > 1).length;

  return {
    totalSent: sent,
    totalOpened: opened,
    totalDismissed: dismissed,
    openRate: sent > 0 ? opened / sent : 0,
    dismissRate: sent > 0 ? dismissed / sent : 0,
    repeatContentIndicators,
    fatigueIndicators: fatigue,
    byCategory,
    byContentType,
  };
}

function aggregateByCategory(entries: HistoryEntry[]): CategoryAnalytics[] {
  const map = new Map<string, { sent: number; opened: number; dismissed: number }>();
  for (const e of entries) {
    const cur = map.get(e.category) ?? { sent: 0, opened: 0, dismissed: 0 };
    cur.sent++;
    if (e.openedAt) cur.opened++;
    if (e.dismissedAt) cur.dismissed++;
    map.set(e.category, cur);
  }
  return [...map.entries()].map(([category, v]) => ({
    category,
    sent: v.sent,
    opened: v.opened,
    dismissed: v.dismissed,
    openRate: v.sent > 0 ? v.opened / v.sent : 0,
    dismissRate: v.sent > 0 ? v.dismissed / v.sent : 0,
  }));
}

function aggregateByContentType(entries: HistoryEntry[]): ContentTypeAnalytics[] {
  const map = new Map<string, { sent: number; opened: number }>();
  for (const e of entries) {
    const ct = e.contentType ?? "unknown";
    const cur = map.get(ct) ?? { sent: 0, opened: 0 };
    cur.sent++;
    if (e.openedAt) cur.opened++;
    map.set(ct, cur);
  }
  return [...map.entries()].map(([contentType, v]) => ({
    contentType,
    sent: v.sent,
    opened: v.opened,
    openRate: v.sent > 0 ? v.opened / v.sent : 0,
  }));
}
