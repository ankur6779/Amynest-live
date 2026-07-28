import { resolveVideosPerDay } from "../config/index.js";
import type {
  ContentEngineConfig,
  DayOfWeek,
  DaySlot,
  WeekCalendar,
} from "../types/index.js";
import { DAYS_OF_WEEK } from "../types/index.js";
import { DEFAULT_WEEK_CALENDAR } from "./default-week.js";

const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function getDayOfWeek(date: Date): DayOfWeek {
  const idx = date.getUTCDay();
  const found = DAYS_OF_WEEK.find((d) => DAY_INDEX[d] === idx);
  if (!found) throw new Error(`Unable to resolve day of week for ${date.toISOString()}`);
  return found;
}

/** Parse YYYY-MM-DD as a UTC calendar date. */
export function parseIsoDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Expected YYYY-MM-DD, got: ${date}`);
  }
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return d;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function listDateRange(startDate: string, dayCount: number): string[] {
  if (dayCount < 1) return [];
  const start = parseIsoDate(startDate);
  const out: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    out.push(formatIsoDate(addUtcDays(start, i)));
  }
  return out;
}

/**
 * Resolve slots for a weekday.
 * When `videosPerDay` is lower than defined slots, keep earliest slots.
 * When higher, clone preferred-category fallback slots.
 */
export function resolveSlotsForDay(
  calendar: WeekCalendar,
  day: DayOfWeek,
  videosPerDay: number,
  preferredCategories: ContentEngineConfig["preferredCategories"],
): DaySlot[] {
  const defined = calendar[day] ?? [];
  if (videosPerDay <= 0) return [];
  if (videosPerDay <= defined.length) {
    return defined.slice(0, videosPerDay);
  }

  const slots = [...defined];
  let extra = videosPerDay - defined.length;
  let n = 1;
  while (extra > 0) {
    const category =
      preferredCategories[(defined.length + n - 1) % preferredCategories.length] ??
      "Parenting";
    slots.push({
      slotId: `${day}-extra-${n}`,
      label: `Extra ${n}`,
      preferredCategories: [category],
      preferredVideoStyles: ["short"],
      uploadOffsetMinutes: (defined.at(-1)?.uploadOffsetMinutes ?? 0) + n * 120,
    });
    n += 1;
    extra -= 1;
  }
  return slots;
}

export interface DayPlan {
  date: string;
  dayOfWeek: DayOfWeek;
  slots: DaySlot[];
}

/** Expand a date range into concrete day plans using config + calendar. */
export function buildDayPlans(
  startDate: string,
  dayCount: number,
  config: ContentEngineConfig,
  calendar: WeekCalendar = DEFAULT_WEEK_CALENDAR,
): DayPlan[] {
  return listDateRange(startDate, dayCount).map((date) => {
    const dayOfWeek = getDayOfWeek(parseIsoDate(date));
    const videosPerDay = resolveVideosPerDay(config, dayOfWeek);
    const slots = resolveSlotsForDay(
      calendar,
      dayOfWeek,
      videosPerDay,
      config.preferredCategories,
    );
    return { date, dayOfWeek, slots };
  });
}

/**
 * Build an ISO upload timestamp from date + HH:mm + optional offset.
 * Uses a fixed offset approximation for Asia/Kolkata (+05:30) when timezone
 * is Asia/Kolkata; other zones fall back to treating uploadTime as UTC.
 */
export function buildUploadTimestamp(
  date: string,
  uploadTime: string,
  timezone: string,
  offsetMinutes = 0,
): string {
  const [hh, mm] = uploadTime.split(":").map(Number);
  const totalMinutes = (hh ?? 0) * 60 + (mm ?? 0) + offsetMinutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minuteOfDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  const base = parseIsoDate(date);
  const localDay = addUtcDays(base, dayOffset);
  const y = localDay.getUTCFullYear();
  const m = String(localDay.getUTCMonth() + 1).padStart(2, "0");
  const d = String(localDay.getUTCDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");

  if (timezone === "Asia/Kolkata" || timezone === "Asia/Calcutta") {
    return new Date(`${y}-${m}-${d}T${h}:${min}:00+05:30`).toISOString();
  }

  return new Date(`${y}-${m}-${d}T${h}:${min}:00.000Z`).toISOString();
}

export function getDefaultWeekCalendar(): WeekCalendar {
  return structuredClone(DEFAULT_WEEK_CALENDAR);
}
