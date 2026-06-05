// Country-aware school event types (Phase 1 + 2)

import type { EventCategoryId } from "./types";

export type EventPrepCountry =
  | "IN"
  | "US"
  | "GB"
  | "AU"
  | "CA"
  | "NZ"
  | "AE"
  | "EU"
  | "global";

export type SchoolEventCategory =
  | "School Event"
  | "Festival"
  | "Competition"
  | "Holiday";

export interface PrepTimelineStep {
  /** Days before the event (7 = one week out, 0 = event day). */
  daysBefore: number;
  label: string;
}

export interface SchoolEvent {
  id: string;
  /** ISO country code(s) this event belongs to. */
  countries: EventPrepCountry[];
  name: string;
  emoji: string;
  /** Human-readable date label, e.g. "15 Aug" or "Oct/Nov (variable)". */
  dateLabel: string;
  category: SchoolEventCategory;
  ageGroups: string[];
  tags: string[];
  /** Fixed calendar month (0 = Jan … 11 = Dec). Omit for variable dates. */
  month?: number;
  /** Fixed calendar day (1–31). Requires `month`. */
  day?: number;
  /** Approximate month for variable festivals (used for sorting). */
  approxMonth?: number;
  overview: string;
  whatToPrepare: string[];
  speechIdeas: string[];
  activities: string[];
  prepTimeline: PrepTimelineStep[];
  checklist: string[];
  /** Links to existing costume category for character browser. */
  costumeCategory?: EventCategoryId;
  accent: [string, string];
}

export interface UpcomingEvent {
  event: SchoolEvent;
  /** Days until the next occurrence (0 = today). */
  daysUntil: number;
  /** ISO date string for the next occurrence. */
  nextDate: string;
}

export interface CountryConfig {
  code: EventPrepCountry;
  flag: string;
  label: string;
}
