import type { EventPrepCountry, SchoolEvent, UpcomingEvent } from "./eventTypes";
import { detectEventPrepCountry } from "./country";
import { EVENTS_IN } from "./content/events-in";
import { EVENTS_US } from "./content/events-us";
import { EVENTS_GB } from "./content/events-gb";
import { EVENTS_AU } from "./content/events-au";
import { EVENTS_NZ } from "./content/events-nz";
import { EVENTS_CA } from "./content/events-ca";
import { EVENTS_AE } from "./content/events-ae";
import { EVENTS_EU } from "./content/events-eu";

export const ALL_SCHOOL_EVENTS: SchoolEvent[] = [
  ...EVENTS_IN,
  ...EVENTS_US,
  ...EVENTS_GB,
  ...EVENTS_AU,
  ...EVENTS_NZ,
  ...EVENTS_CA,
  ...EVENTS_AE,
  ...EVENTS_EU,
];

/** Events relevant to a country (includes shared multi-country events). */
export function getEvents(country?: EventPrepCountry | null): SchoolEvent[] {
  const code = country ?? detectEventPrepCountry();
  if (code === "global") {
    return ALL_SCHOOL_EVENTS;
  }
  return ALL_SCHOOL_EVENTS.filter(
    (e) => e.countries.includes(code) || e.countries.includes("global" as EventPrepCountry),
  );
}

export function findSchoolEvent(id: string): SchoolEvent | undefined {
  return ALL_SCHOOL_EVENTS.find((e) => e.id === id);
}

function hasFixedDate(event: SchoolEvent): boolean {
  return event.month != null && event.day != null;
}

function hasApproxDate(event: SchoolEvent): boolean {
  return event.approxMonth != null;
}

/** Sort key: fixed dates beat fuzzy school events when days are close; undated events sink. */
function compareUpcoming(a: UpcomingEvent, b: UpcomingEvent): number {
  if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;

  const aFixed = hasFixedDate(a.event) ? 0 : hasApproxDate(a.event) ? 1 : 2;
  const bFixed = hasFixedDate(b.event) ? 0 : hasApproxDate(b.event) ? 1 : 2;
  if (aFixed !== bFixed) return aFixed - bFixed;

  if (a.event.category === "Holiday" && b.event.category !== "Holiday") return -1;
  if (b.event.category === "Holiday" && a.event.category !== "Holiday") return 1;

  return a.event.name.localeCompare(b.event.name);
}

/** Compute days until the next occurrence of an event. */
export function daysUntilEvent(event: SchoolEvent, from: Date = new Date()): number {
  const today = startOfDay(from);

  if (event.month != null && event.day != null) {
    let target = startOfDay(new Date(from.getFullYear(), event.month, event.day));
    if (target < today) {
      target = startOfDay(new Date(from.getFullYear() + 1, event.month, event.day));
    }
    return Math.round((target.getTime() - today.getTime()) / MS_DAY);
  }

  if (event.approxMonth != null) {
    // Use the 15th of the approximate month as anchor; roll forward if passed.
    let target = startOfDay(new Date(from.getFullYear(), event.approxMonth, 15));
    if (target < today) {
      target = startOfDay(new Date(from.getFullYear() + 1, event.approxMonth, 15));
    }
    return Math.round((target.getTime() - today.getTime()) / MS_DAY);
  }

  // No calendar anchor — always last in lists.
  return 400;
}

function nextOccurrenceDate(event: SchoolEvent, from: Date = new Date()): string {
  const days = daysUntilEvent(event, from);
  if (days >= 400) return "";
  const d = startOfDay(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const MS_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toUpcoming(event: SchoolEvent, from: Date): UpcomingEvent {
  return {
    event,
    daysUntil: daysUntilEvent(event, from),
    nextDate: nextOccurrenceDate(event, from),
  };
}

/** Upcoming events sorted by nearest date. */
export function getUpcomingEvents(
  country?: EventPrepCountry | null,
  limit = 12,
  from: Date = new Date(),
): UpcomingEvent[] {
  return getEvents(country)
    .map((event) => toUpcoming(event, from))
    .filter((u) => u.daysUntil < 400)
    .sort(compareUpcoming)
    .slice(0, limit);
}

/**
 * Hero card: nearest event, but prefer the next major fixed-date holiday within 90 days
 * when the closest item is only a fuzzy school-schedule event.
 */
export function getNextEvent(
  country?: EventPrepCountry | null,
  from: Date = new Date(),
): UpcomingEvent | null {
  const sorted = getEvents(country)
    .map((event) => toUpcoming(event, from))
    .filter((u) => u.daysUntil < 400)
    .sort(compareUpcoming);

  if (!sorted.length) return null;

  const nearest = sorted[0]!;
  const nextMajorHoliday = sorted.find(
    (u) =>
      hasFixedDate(u.event) &&
      u.event.category === "Holiday" &&
      u.daysUntil <= 90,
  );

  if (
    nextMajorHoliday &&
    !hasFixedDate(nearest.event) &&
    nextMajorHoliday.daysUntil <= nearest.daysUntil + 45
  ) {
    return nextMajorHoliday;
  }

  return nearest;
}

/** Simple search across name, tags, and category. */
export function searchSchoolEvents(
  query: string,
  country?: EventPrepCountry | null,
): SchoolEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return getEvents(country);
  return getEvents(country).filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.tags.some((t) => t.includes(q)) ||
      e.category.toLowerCase().includes(q) ||
      e.dateLabel.toLowerCase().includes(q),
  );
}

/** Human-readable countdown label. */
export function formatCountdown(daysUntil: number): string {
  if (daysUntil === 0) return "Today!";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil <= 7) return `${daysUntil} days`;
  if (daysUntil <= 30) return `${Math.ceil(daysUntil / 7)} weeks`;
  const months = Math.round(daysUntil / 30);
  return months <= 1 ? "About 1 month" : `About ${months} months`;
}

export {
  EVENTS_IN,
  EVENTS_US,
  EVENTS_GB,
  EVENTS_AU,
  EVENTS_NZ,
  EVENTS_CA,
  EVENTS_AE,
  EVENTS_EU,
};
