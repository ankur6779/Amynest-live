import type { ContentPackage } from "../../types/content-package.js";
import type { BestUploadTime } from "./types.js";

const DEFAULT_HOUR = 19; // 7:00 PM IST
const DEFAULT_TZ = "Asia/Kolkata";

/**
 * Recommend best upload weekday/hour/timezone.
 * Uses light Continuous Learning signals when present; otherwise 7:00 PM IST.
 */
export function recommendBestUploadTime(input: {
  content: ContentPackage;
  /** Optional historical best hours from Continuous Learning (0–23). */
  learnedHours?: number[];
  /** Optional historical best weekdays. */
  learnedWeekdays?: string[];
}): BestUploadTime {
  const learnedHour = modeNumber(input.learnedHours);
  const learnedDay = modeString(input.learnedWeekdays);

  if (learnedHour != null || learnedDay) {
    const hour = learnedHour ?? DEFAULT_HOUR;
    const weekday = learnedDay ?? weekdayForCategory(input.content.topic.category);
    return {
      weekday,
      hour,
      minute: 0,
      timezone: DEFAULT_TZ,
      label: `${weekday} ${formatHour(hour)} IST`,
      source: "continuous-learning",
    };
  }

  const weekday = weekdayForCategory(input.content.topic.category);
  return {
    weekday,
    hour: DEFAULT_HOUR,
    minute: 0,
    timezone: DEFAULT_TZ,
    label: `${weekday} ${formatHour(DEFAULT_HOUR)} IST`,
    source: "default",
  };
}

function weekdayForCategory(category: string): string {
  if (/Learning|Brain|Speech/i.test(category)) return "Monday";
  if (/Nutrition|Sleep|Baby|Safety|Health/i.test(category)) return "Tuesday";
  if (/Games|Family/i.test(category)) return "Thursday";
  if (/Routines/i.test(category)) return "Friday";
  if (/Amy Astro/i.test(category)) return "Saturday";
  return "Sunday";
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

function modeNumber(values?: number[]): number | undefined {
  if (!values?.length) return undefined;
  const counts = new Map<number, number>();
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const hour = Math.max(0, Math.min(23, Math.round(v)));
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let best: number | undefined;
  let bestCount = 0;
  for (const [hour, count] of counts) {
    if (count > bestCount) {
      best = hour;
      bestCount = count;
    }
  }
  return best;
}

function modeString(values?: string[]): string | undefined {
  if (!values?.length) return undefined;
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (count > bestCount) {
      best = day;
      bestCount = count;
    }
  }
  return best;
}
