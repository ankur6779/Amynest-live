import type { EventPrepCountry, SchoolEvent, UpcomingEvent } from "./eventTypes";
import { detectEventPrepCountry } from "./country";
import { EVENTS_IN } from "./content/events-in";
import { EVENTS_US } from "./content/events-us";

export const ALL_SCHOOL_EVENTS: SchoolEvent[] = [...EVENTS_IN, ...EVENTS_US];

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

  return 365;
}

function nextOccurrenceDate(event: SchoolEvent, from: Date = new Date()): string {
  const days = daysUntilEvent(event, from);
  const d = startOfDay(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const MS_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Upcoming events sorted by nearest date. */
export function getUpcomingEvents(
  country?: EventPrepCountry | null,
  limit = 5,
  from: Date = new Date(),
): UpcomingEvent[] {
  return getEvents(country)
    .map((event) => ({
      event,
      daysUntil: daysUntilEvent(event, from),
      nextDate: nextOccurrenceDate(event, from),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

/** The single nearest upcoming event. */
export function getNextEvent(
  country?: EventPrepCountry | null,
  from: Date = new Date(),
): UpcomingEvent | null {
  return getUpcomingEvents(country, 1, from)[0] ?? null;
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

export { EVENTS_IN, EVENTS_US };
