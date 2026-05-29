import type { HistoryEntry } from "../types.js";
import {
  EXACT_BODY_WINDOW_DAYS,
  RECOMMENDATION_WINDOW_DAYS,
  TOPIC_WINDOW_DAYS,
} from "../constants.js";
import { contentHash, daysSince } from "../personalization/context.js";

export interface RepetitionViolation {
  rule: "exact_body" | "recommendation" | "topic" | "daily_theme" | "daily_wording";
  daysAgo?: number;
}

export function checkAntiRepetition(
  candidate: {
    title: string;
    body: string;
    recommendationKey: string;
    topicKey: string;
    theme: string;
    category: string;
  },
  history: HistoryEntry[],
  localDate: string,
  now = new Date(),
): RepetitionViolation | null {
  const hash = contentHash(candidate.title, candidate.body);

  const sentToday = history.filter(
    (h) =>
      h.sentAt.toISOString().slice(0, 10) === localDate ||
      formatLocalDate(h.sentAt) === localDate,
  );

  for (const h of sentToday) {
    if (h.theme === candidate.theme) {
      return { rule: "daily_theme" };
    }
    if (h.body.trim().toLowerCase() === candidate.body.trim().toLowerCase()) {
      return { rule: "daily_wording" };
    }
    if (h.topicKey === candidate.topicKey) {
      return { rule: "daily_theme" };
    }
  }

  for (const h of history) {
    const days = daysSince(h.sentAt, now);
    if (h.contentHash === hash && days < EXACT_BODY_WINDOW_DAYS) {
      return { rule: "exact_body", daysAgo: days };
    }
    if (
      h.recommendationKey === candidate.recommendationKey &&
      days < RECOMMENDATION_WINDOW_DAYS
    ) {
      return { rule: "recommendation", daysAgo: days };
    }
    if (h.topicKey === candidate.topicKey && days < TOPIC_WINDOW_DAYS) {
      return { rule: "topic", daysAgo: days };
    }
  }

  return null;
}

function formatLocalDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Jaccard-like similarity on word sets — flag near-duplicates within 7 days. */
export function bodySimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter++;
  }
  return inter / (wa.size + wb.size - inter);
}

export function hasSimilarRecentBody(
  body: string,
  history: HistoryEntry[],
  windowDays = TOPIC_WINDOW_DAYS,
  threshold = 0.72,
  now = new Date(),
): boolean {
  for (const h of history) {
    if (daysSince(h.sentAt, now) >= windowDays) continue;
    if (bodySimilarity(body, h.body) >= threshold) return true;
  }
  return false;
}
