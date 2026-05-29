import type { DeepLinkAnalyticsEvent } from "./types.js";

export interface DeepLinkMetricRow {
  category: string;
  sent: number;
  clicked: number;
  completed: number;
  clickRate: number;
  completionRate: number;
  dropOffRate: number;
}

export interface DeepLinkMetricsInput {
  category: string;
  sentAt?: Date | string | null;
  openedAt?: Date | string | null;
  outcomeAt?: Date | string | null;
}

/** Aggregate destination success rates by notification category. */
export function computeDestinationMetrics(
  rows: DeepLinkMetricsInput[],
): DeepLinkMetricRow[] {
  const byCategory = new Map<string, { sent: number; clicked: number; completed: number }>();

  for (const row of rows) {
    const cat = row.category || "unknown";
    const bucket = byCategory.get(cat) ?? { sent: 0, clicked: 0, completed: 0 };
    bucket.sent += 1;
    if (row.openedAt) bucket.clicked += 1;
    if (row.outcomeAt) bucket.completed += 1;
    byCategory.set(cat, bucket);
  }

  return [...byCategory.entries()].map(([category, v]) => ({
    category,
    sent: v.sent,
    clicked: v.clicked,
    completed: v.completed,
    clickRate: v.sent > 0 ? Math.round((v.clicked / v.sent) * 100) : 0,
    completionRate: v.clicked > 0 ? Math.round((v.completed / v.clicked) * 100) : 0,
    dropOffRate: v.clicked > 0 ? Math.round(((v.clicked - v.completed) / v.clicked) * 100) : 0,
  }));
}

export const DEEP_LINK_FUNNEL: DeepLinkAnalyticsEvent[] = [
  "notification_clicked",
  "deep_link_opened",
  "destination_loaded",
  "action_completed",
];
