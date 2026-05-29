import type { AgeGroup, ContentContext, Season, TimeOfDay } from "../types.js";
import {
  culturalRegionFromCountry,
  defaultLocaleForCountry,
  isRtlLocale,
  normalizeLocale,
  type SupportedLocale,
} from "../global/locales.js";
import { localMonthDay, resolveCalendarContext } from "../global/calendar.js";
import type { WeatherContext } from "../global/weather.js";

export function ageGroupFromAge(age: number): AgeGroup {
  if (age < 3) return "toddler";
  if (age < 6) return "preschool";
  if (age < 10) return "child";
  return "tween";
}

export function localDateString(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isWeekendInTz(timezone: string, now = new Date()): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  return day === "Sat" || day === "Sun";
}

export function isSchoolDay(timezone: string, now = new Date()): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  return day !== "Sat" && day !== "Sun";
}

export function timeOfDayInTz(timezone: string, now = new Date()): TimeOfDay {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10,
  );
  if (hour < 10) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function buildContentContext(input: {
  userId: string;
  childId: number;
  childName: string;
  age: number;
  ageMonths: number;
  foodType: string;
  timezone: string;
  category: import("@workspace/db").NotificationCategory;
  engagementScore: number;
  locale?: string | null;
  countryCode?: string | null;
  weather?: WeatherContext | null;
  allergies?: string[];
  now?: Date;
}): ContentContext {
  const now = input.now ?? new Date();
  const tz = input.timezone;
  const localDate = localDateString(tz, now);
  const countryCode = (input.countryCode ?? "IN").toUpperCase();
  const culturalRegion = culturalRegionFromCountry(countryCode);
  const locale: SupportedLocale = normalizeLocale(
    input.locale ?? defaultLocaleForCountry(countryCode),
  );
  const { month, day } = localMonthDay(localDate);
  const calendar = resolveCalendarContext(culturalRegion, month, day);
  const schoolDay =
    isSchoolDay(tz, now) &&
    calendar.schoolTerm === "term" &&
    !calendar.isSummerBreak;

  return {
    userId: input.userId,
    childId: input.childId,
    childName: input.childName,
    age: input.age,
    ageMonths: input.ageMonths,
    ageGroup: ageGroupFromAge(input.age),
    foodType: input.foodType,
    timezone: tz,
    localDate,
    timeOfDay: timeOfDayInTz(tz, now),
    isWeekend: isWeekendInTz(tz, now),
    isSchoolDay: schoolDay,
    season: seasonForDate(tz, now, culturalRegion),
    engagementScore: input.engagementScore,
    category: input.category,
    locale,
    countryCode,
    culturalRegion,
    calendar,
    weather: input.weather ?? null,
    rtl: isRtlLocale(locale),
    allergies: input.allergies ?? [],
  };
}

function seasonForDate(
  timezone: string,
  now: Date,
  region: ReturnType<typeof culturalRegionFromCountry>,
): Season {
  const month = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "numeric" }).format(now),
    10,
  );
  const day = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, day: "numeric" }).format(now),
    10,
  );
  if (calendarFestive(region, month, day)) return "festive";
  if (region === "south_asia" && month >= 6 && month <= 9) return "monsoon";
  if (month >= 3 && month <= 5) return "summer";
  if (month === 12 || month <= 2) return "winter";
  return "spring";
}

function calendarFestive(
  region: ReturnType<typeof culturalRegionFromCountry>,
  month: number,
  day: number,
): boolean {
  if (region === "south_asia" && (month === 10 || month === 11)) return true;
  if (region === "north_america" && month === 11) return true;
  if (month === 12 && day >= 20) return true;
  if (region === "east_asia" && month === 2) return true;
  if (region === "middle_east" && month === 4) return true;
  return false;
}

export function interpolate(template: string, ctx: ContentContext, extra: Record<string, string> = {}): string {
  const vars: Record<string, string> = {
    name: ctx.childName,
    age: String(ctx.age),
    ...extra,
  };
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function contentHash(title: string, body: string): string {
  const normalized = `${title.trim().toLowerCase()}|${body.trim().toLowerCase()}`;
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

export function daysSince(date: Date, now = new Date()): number {
  return (now.getTime() - date.getTime()) / (86400000);
}
