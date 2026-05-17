/**
 * Parse parent special plans, inject locked schedule blocks, and validate placement.
 */
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import {
  isLockedScheduleItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  resolveTimelineOverlaps,
} from "./routine-scheduler.js";

export type SpecialEventType =
  | "doctor"
  | "birthday"
  | "outing"
  | "class"
  | "party"
  | "appointment"
  | "other";

export type ParsedSpecialEvent = {
  activity: string;
  type: SpecialEventType;
  startMins: number;
  duration: number;
  raw: string;
  timeSource: "explicit" | "inferred";
};

export type SpecialEventPlacementStatus = "success" | "fallback" | "skipped";

export type SpecialEventDebug = {
  eventDetected: boolean;
  eventTime: string | null;
  eventType: string | null;
  eventActivity: string | null;
  eventPlacementStatus: SpecialEventPlacementStatus;
  validationWarnings: string[];
};

const HANDLER_SEGMENT_RE =
  /today is being handled by|both parents.*handling|babysitter|grandparent|handled by dad|handled by mom/i;

const TIME_PATTERNS: Array<{
  re: RegExp;
  parse: (m: RegExpMatchArray) => { h: number; m: number } | null;
}> = [
  {
    re: /(?:@|at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: parseInt(m[2]!, 10) }),
  },
  {
    re: /(?:@|at\s+)?(\d{1,2})\s*(am|pm)/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: 0 }),
  },
  {
    re: /\b(\d{1,2})\s*(am|pm)\b/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: 0 }),
  },
];

const DEFAULT_DURATION: Record<SpecialEventType, number> = {
  doctor: 60,
  birthday: 90,
  party: 90,
  outing: 120,
  class: 60,
  appointment: 60,
  other: 45,
};

const INFERRED_START: Record<SpecialEventType, number> = {
  doctor: 10 * 60,
  appointment: 10 * 60,
  birthday: 17 * 60,
  party: 17 * 60,
  outing: 18 * 60,
  class: 16 * 60,
  other: 15 * 60,
};

export function stripHandlerSegments(specialPlans: string): string {
  const parts = specialPlans
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const events = parts.filter((p) => !HANDLER_SEGMENT_RE.test(p));
  if (events.length > 0) return events.join(" | ");
  return specialPlans.trim();
}

export function inferSpecialEventType(text: string): SpecialEventType {
  const t = text.toLowerCase();
  if (/doctor|dentist|clinic|hospital|check-?up|paediatric|pediatric|vaccin/i.test(t)) {
    return "doctor";
  }
  if (/birthday|bday|cake cutting/i.test(t)) return "birthday";
  if (/party|celebration|function/i.test(t)) return "party";
  if (/outing|picnic|zoo|museum|trip to|theme park|beach day/i.test(t)) {
    return "outing";
  }
  if (/class|lesson|tuition|soccer|football|swim|dance|music|karate|ballet/i.test(t)) {
    return "class";
  }
  if (/appointment|visit/i.test(t)) return "appointment";
  return "other";
}

export function extractTimeFromSpecialPlan(text: string): {
  mins: number | null;
  source: "explicit" | "inferred";
} {
  for (const { re, parse } of TIME_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const parts = parse(m);
    if (!parts) continue;
    let h = parts.h;
    const min = parts.m;
    const ap = m[3]?.toLowerCase() ?? m[2]?.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return { mins: h * 60 + min, source: "explicit" };
    }
  }
  const type = inferSpecialEventType(text);
  return { mins: INFERRED_START[type], source: "inferred" };
}

function formatActivityLabel(raw: string): string {
  let label = raw
    .replace(/(?:@|at)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (label.length > 80) label = `${label.slice(0, 77)}…`;
  if (!label) return "Special activity";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseSpecialPlans(
  specialPlans: string | null | undefined,
  bounds?: { wakeMins: number; sleepMins: number },
): { event: ParsedSpecialEvent | null; debug: SpecialEventDebug } {
  const emptyDebug: SpecialEventDebug = {
    eventDetected: false,
    eventTime: null,
    eventType: null,
    eventActivity: null,
    eventPlacementStatus: "skipped",
    validationWarnings: [],
  };

  if (!specialPlans?.trim()) {
    return { event: null, debug: emptyDebug };
  }

  const cleaned = stripHandlerSegments(specialPlans.trim());
  if (!cleaned) {
    return { event: null, debug: emptyDebug };
  }

  const primary = cleaned.split(/\s*\|\s*/)[0]!.trim();
  const type = inferSpecialEventType(primary);
  const { mins, source } = extractTimeFromSpecialPlan(primary);
  let startMins = mins ?? INFERRED_START[type];
  const wake = bounds?.wakeMins ?? 7 * 60;
  const sleep = bounds?.sleepMins ?? 21 * 60;

  if (startMins < wake + 15) startMins = wake + 30;
  if (startMins > sleep - 45) startMins = Math.max(wake + 30, sleep - 90);

  const duration = DEFAULT_DURATION[type];
  const activity = formatActivityLabel(primary);

  return {
    event: {
      activity,
      type,
      startMins,
      duration,
      raw: primary,
      timeSource: source,
    },
    debug: {
      eventDetected: true,
      eventTime: minsToTime24(startMins),
      eventType: type,
      eventActivity: activity,
      eventPlacementStatus: "success",
      validationWarnings: [],
    },
  };
}

export function isLockedSpecialEvent(item: RoutineScheduleItem): boolean {
  return (
    item.locked === true ||
    item.culturalTag === "special_event" ||
    (item as { structureKind?: string }).structureKind === "special_event"
  );
}

function isProbableDuplicateOfEvent(
  item: RoutineScheduleItem,
  event: ParsedSpecialEvent,
): boolean {
  const act = item.activity.toLowerCase();
  const raw = event.raw.toLowerCase();
  if (act === event.activity.toLowerCase()) return true;
  if (raw.length >= 8 && act.includes(raw.slice(0, Math.min(20, raw.length)))) {
    return true;
  }
  if (/\bspecial (activity|plan|event)\b/i.test(act) && event.raw.length >= 6) {
    return true;
  }
  return false;
}

export function buildSpecialEventScheduleItem(
  event: ParsedSpecialEvent,
): RoutineScheduleItem {
  return {
    time: minsToTime24(event.startMins),
    activity: event.activity,
    duration: event.duration,
    category: "family",
    status: "pending",
    locked: true,
    culturalTag: "special_event",
    notes:
      event.timeSource === "inferred"
        ? `Special plan (${event.type}) — time estimated to fit the day.`
        : "Special plan for today — fixed time slot.",
    scheduleDecision: {
      reason: `Special event: ${event.activity}`,
      source: "preference",
    },
  };
}

export function injectSpecialEventBlock(
  items: RoutineScheduleItem[],
  event: ParsedSpecialEvent,
): RoutineScheduleItem[] {
  const filtered = items.filter((i) => !isProbableDuplicateOfEvent(i, event));
  return [...filtered, buildSpecialEventScheduleItem(event)];
}

export function validateSpecialEventPlacement(
  items: RoutineScheduleItem[],
  event: ParsedSpecialEvent | null,
  opts: {
    wakeMins: number;
    sleepMins: number;
    schoolStartMins?: number;
    schoolEndMins?: number;
    hasSchool?: boolean;
  },
): SpecialEventDebug {
  if (!event) {
    return {
      eventDetected: false,
      eventTime: null,
      eventType: null,
      eventActivity: null,
      eventPlacementStatus: "skipped",
      validationWarnings: [],
    };
  }

  const warnings: string[] = [];
  const match = items.find(
    (i) =>
      isLockedSpecialEvent(i) ||
      i.activity.toLowerCase() === event.activity.toLowerCase(),
  );

  if (!match) {
    return {
      eventDetected: true,
      eventTime: minsToTime24(event.startMins),
      eventType: event.type,
      eventActivity: event.activity,
      eventPlacementStatus: "fallback",
      validationWarnings: ["special-event: not found in final schedule"],
    };
  }

  const start = parseTimeToMins(normalizeTo24h(match.time));
  const end = start + (match.duration ?? event.duration);

  if (start < opts.wakeMins) {
    warnings.push("special-event: starts before wake window");
  }
  if (start >= opts.sleepMins) {
    warnings.push("special-event: starts at or after bedtime");
  }

  if (
    opts.hasSchool &&
    opts.schoolStartMins != null &&
    opts.schoolEndMins != null &&
    start < opts.schoolEndMins &&
    end > opts.schoolStartMins
  ) {
    warnings.push("special-event: overlaps school block");
  }

  const sleepItem = items.find((i) => /lights out|sleep/i.test(i.activity));
  if (sleepItem) {
    const sleepStart = parseTimeToMins(normalizeTo24h(sleepItem.time));
    if (start >= sleepStart || end > sleepStart) {
      warnings.push("special-event: overlaps sleep");
    }
  }

  const placementStatus: SpecialEventPlacementStatus =
    warnings.length === 0 ? "success" : "fallback";

  return {
    eventDetected: true,
    eventTime: minsToTime24(start),
    eventType: event.type,
    eventActivity: match.activity,
    eventPlacementStatus: placementStatus,
    validationWarnings: warnings,
  };
}

function isSleepLike(item: RoutineScheduleItem): boolean {
  return /lights out|sleep/i.test(item.activity);
}

const GAP_AFTER_EVENT = 10;

export type TimelineShift = {
  activity: string;
  from?: string;
  to?: string;
  reason: string;
};

function isFixedRecurringLock(item: RoutineScheduleItem): boolean {
  return item.culturalTag === "fixed_recurring" || item.activitySource === "fixed";
}

/** Lower = higher priority anchor (special event before fixed recurring). */
function lockedAnchorPriority(item: RoutineScheduleItem): number {
  if (isLockedSpecialEvent(item)) return 0;
  if (isFixedRecurringLock(item)) return 1;
  return 2;
}

function shiftReasonForLock(lock: RoutineScheduleItem): string {
  if (isLockedSpecialEvent(lock)) {
    return `Rescheduled due to ${lock.activity}`;
  }
  if (isFixedRecurringLock(lock)) {
    return `Rescheduled around ${lock.activity}`;
  }
  return "Rescheduled around a locked block";
}

/**
 * Shift non-locked blocks that overlap locked anchors.
 * Priority: special event > fixed activity > AI schedule. Locked anchors never move.
 */
export function shiftNonLockedAroundLockedEvents(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; shiftsApplied: TimelineShift[] } {
  const shiftsApplied: TimelineShift[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
  );

  const locks = sorted
    .filter(isLockedScheduleItem)
    .sort(
      (a, b) =>
        lockedAnchorPriority(a) - lockedAnchorPriority(b) ||
        parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
    );

  for (const lock of locks) {
    const lockStart = parseTimeToMins(normalizeTo24h(lock.time));
    const lockEnd = lockStart + (lock.duration ?? 45);
    const reason = shiftReasonForLock(lock);

    for (const it of sorted) {
      if (isLockedScheduleItem(it) || isSleepLike(it)) continue;
      let start = parseTimeToMins(normalizeTo24h(it.time));
      const end = start + (it.duration ?? 30);
      if (start >= lockEnd || end <= lockStart) continue;

      if (start < lockStart) {
        const maxDur = Math.max(15, lockStart - start - GAP_AFTER_EVENT);
        if ((it.duration ?? 30) > maxDur) {
          it.duration = maxDur;
        }
        continue;
      }

      const fromTime = it.time;
      start = lockEnd + GAP_AFTER_EVENT;
      it.time = minsToTime24(start);
      if (fromTime !== it.time) {
        it.scheduleDecision = {
          reason,
          source: "structure",
          originalActivity: it.scheduleDecision?.originalActivity ?? it.activity,
        };
        shiftsApplied.push({
          activity: it.activity,
          from: fromTime,
          to: it.time,
          reason,
        });
      }
    }
  }

  return {
    items: sorted.sort(
      (a, b) => parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
    ),
    shiftsApplied,
  };
}

/**
 * Re-insert parsed special event if post-processing dropped it; resolve overlaps around it.
 */
export function ensureSpecialEventsPreserved(
  items: RoutineScheduleItem[],
  event: ParsedSpecialEvent | null,
  bounds: { wakeMins: number; sleepMins: number },
): RoutineScheduleItem[] {
  let working = [...items];
  if (event) {
    working = working.filter((i) => !isProbableDuplicateOfEvent(i, event));
  }

  const hasLocked = working.some(isLockedSpecialEvent);
  if (!hasLocked && event) {
    working = [...working, buildSpecialEventScheduleItem(event)];
  }

  working = shiftNonLockedAroundLockedEvents(working).items;

  const sleep = working.find(isSleepLike);
  if (sleep) {
    const sleepStart = parseTimeToMins(normalizeTo24h(sleep.time));
    const windDownDur = 25;
    for (const it of working) {
      if (isSleepLike(it) || isLockedScheduleItem(it)) continue;
      let start = parseTimeToMins(normalizeTo24h(it.time));
      let dur = it.duration ?? 30;
      let end = start + dur;
      if (end <= sleepStart) continue;
      if (start >= sleepStart) continue;
      const maxDur = sleepStart - start - 5;
      if (maxDur >= 10) {
        it.duration = maxDur;
        continue;
      }
      dur = Math.min(dur, windDownDur);
      start = sleepStart - dur - 5;
      it.time = minsToTime24(Math.max(bounds.wakeMins + 30, start));
      it.duration = Math.min(dur, sleepStart - parseTimeToMins(it.time) - 5);
    }
  }

  return resolveTimelineOverlaps(working, bounds.wakeMins, bounds.sleepMins);
}
