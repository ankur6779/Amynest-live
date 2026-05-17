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
  /** Number of parsed events (0, 1, or many). */
  eventCount?: number;
  /** All parsed event times for debugging. */
  eventTimes?: string[];
};

export type SpecialPlansParseResult = {
  events: ParsedSpecialEvent[];
  /** First event — backward compatible with single-event callers. */
  event: ParsedSpecialEvent | null;
  debug: SpecialEventDebug;
};

/** Minutes of clear space before a locked event (no filler ending in this window). */
export const PRE_EVENT_CLEARANCE_MINS = 25;
/** Gap-fill must not end within this margin before an event. */
export const GAP_FILL_BEFORE_EVENT_MINS = 30;
/** Transition buffer inserted before event start when space allows. */
export const EVENT_PREP_BUFFER_MINS = 8;

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

function normalizeSpecialPlansSegments(
  specialPlans: string | string[] | null | undefined,
): string[] {
  if (specialPlans == null) return [];
  if (Array.isArray(specialPlans)) {
    return specialPlans.map((p) => p.trim()).filter(Boolean);
  }
  const trimmed = specialPlans.trim();
  if (!trimmed) return [];
  const cleaned = stripHandlerSegments(trimmed);
  if (!cleaned) return [];
  return cleaned
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseSpecialPlanSegment(
  segment: string,
  bounds?: { wakeMins: number; sleepMins: number },
): ParsedSpecialEvent | null {
  const primary = segment.trim();
  if (!primary || HANDLER_SEGMENT_RE.test(primary)) return null;

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
    activity,
    type,
    startMins,
    duration,
    raw: primary,
    timeSource: source,
  };
}

export function parseSpecialPlans(
  specialPlans: string | string[] | null | undefined,
  bounds?: { wakeMins: number; sleepMins: number },
): SpecialPlansParseResult {
  const emptyDebug: SpecialEventDebug = {
    eventDetected: false,
    eventTime: null,
    eventType: null,
    eventActivity: null,
    eventPlacementStatus: "skipped",
    validationWarnings: [],
    eventCount: 0,
    eventTimes: [],
  };

  const segments = normalizeSpecialPlansSegments(specialPlans);
  if (!segments.length) {
    return { events: [], event: null, debug: emptyDebug };
  }

  const events = segments
    .map((seg) => parseSpecialPlanSegment(seg, bounds))
    .filter((e): e is ParsedSpecialEvent => e != null)
    .sort((a, b) => a.startMins - b.startMins);

  if (!events.length) {
    return { events: [], event: null, debug: emptyDebug };
  }

  const first = events[0]!;
  return {
    events,
    event: first,
    debug: {
      eventDetected: true,
      eventTime: minsToTime24(first.startMins),
      eventType: first.type,
      eventActivity: first.activity,
      eventPlacementStatus: "success",
      validationWarnings: [],
      eventCount: events.length,
      eventTimes: events.map((e) => minsToTime24(e.startMins)),
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
  if (isLockedSpecialEvent(item)) return false;
  const act = item.activity.toLowerCase();
  const raw = event.raw.toLowerCase();
  const label = event.activity.toLowerCase();
  if (act === label) return true;
  if (raw.length >= 8 && act.includes(raw.slice(0, Math.min(20, raw.length)))) {
    return true;
  }
  if (label.length >= 10 && act.includes(label.slice(0, Math.min(16, label.length)))) {
    return true;
  }
  if (
    /\bdinner\b/i.test(act) &&
    /\bdinner\b/i.test(raw) &&
    !/\b(outing|restaurant|party)\b/i.test(raw)
  ) {
    return true;
  }
  if (/\bspecial (activity|plan|event)\b/i.test(act) && event.raw.length >= 6) {
    return true;
  }
  return false;
}

function isSleepLike(item: RoutineScheduleItem): boolean {
  return /lights out|sleep/i.test(item.activity);
}

export function buildSpecialEventScheduleItem(
  event: ParsedSpecialEvent,
): RoutineScheduleItem {
  return {
    time: minsToTime24(event.startMins),
    activity: event.activity,
    duration: event.duration,
    category: "event",
    status: "pending",
    locked: true,
    culturalTag: "special_event",
    activitySource: "special",
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

function isStructuredActivity(item: RoutineScheduleItem): boolean {
  return (
    isLockedScheduleItem(item) ||
    item.culturalTag === "fixed_recurring" ||
    item.activitySource === "fixed" ||
    (item.category ?? "").toLowerCase() === "school" ||
    /\bat school\b/i.test(item.activity)
  );
}

function isGenericFillerBlock(item: RoutineScheduleItem): boolean {
  if (isStructuredActivity(item) || isSleepLike(item)) return false;
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin") return false;
  if (/\b(wake up|freshen up|wind.?down|lights out)\b/i.test(item.activity)) return false;
  return (
    /\bfamily time together\b/i.test(item.activity) ||
    /\bfamily outing\b/i.test(item.activity) ||
    /\bcalm family\b/i.test(item.activity) ||
    /creative (activity|project|play)/i.test(item.activity) ||
    /relaxed play/i.test(item.activity) ||
    /evening play/i.test(item.activity) ||
    cat === "family" ||
    cat === "creative" ||
    cat === "play"
  );
}

/**
 * Remove or trim filler blocks that crowd the window before locked events.
 */
export function cleanupBlocksBeforeEvents(
  items: RoutineScheduleItem[],
  events: ParsedSpecialEvent[],
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  if (!events.length) return { items, adjustments };

  let working = [...items];
  const sortedEvents = [...events].sort((a, b) => a.startMins - b.startMins);

  for (const event of sortedEvents) {
    const cutoff = event.startMins - PRE_EVENT_CLEARANCE_MINS;
    const kept: RoutineScheduleItem[] = [];

    for (const it of working) {
      if (isLockedSpecialEvent(it) && isProbableDuplicateOfEvent(it, event)) {
        kept.push(it);
        continue;
      }
      if (isStructuredActivity(it) || isLockedSpecialEvent(it)) {
        kept.push(it);
        continue;
      }

      const start = parseTimeToMins(normalizeTo24h(it.time));
      const end = start + (it.duration ?? 30);

      if (end <= cutoff || start >= event.startMins) {
        kept.push(it);
        continue;
      }

      if (isGenericFillerBlock(it)) {
        const maxDur = cutoff - start;
        if (maxDur >= 15) {
          kept.push({ ...it, duration: maxDur });
          adjustments.push(
            `trimmed "${it.activity}" before ${event.activity} (${PRE_EVENT_CLEARANCE_MINS}min buffer)`,
          );
        } else {
          adjustments.push(`removed "${it.activity}" before ${event.activity}`);
        }
        continue;
      }

      const maxDur = Math.max(15, cutoff - start);
      if (maxDur < (it.duration ?? 30)) {
        kept.push({ ...it, duration: maxDur });
        adjustments.push(`trimmed "${it.activity}" before ${event.activity}`);
      } else {
        kept.push(it);
      }
    }
    working = kept;
  }

  return {
    items: working.sort(
      (a, b) => parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
    ),
    adjustments,
  };
}

export function injectSpecialEventBlock(
  items: RoutineScheduleItem[],
  event: ParsedSpecialEvent,
): RoutineScheduleItem[] {
  return injectSpecialEventBlocks(items, [event]);
}

export function injectSpecialEventBlocks(
  items: RoutineScheduleItem[],
  events: ParsedSpecialEvent[],
  bounds?: { wakeMins: number; sleepMins: number },
): RoutineScheduleItem[] {
  if (!events.length) return items;

  const wakeMins =
    bounds?.wakeMins ??
    Math.min(...items.map((i) => parseTimeToMins(normalizeTo24h(i.time))), 7 * 60);

  let working = [...items];
  for (const ev of events) {
    working = working.filter((i) => !isProbableDuplicateOfEvent(i, ev));
  }

  const cleaned = cleanupBlocksBeforeEvents(working, events);
  working = cleaned.items;

  for (const ev of events) {
    const prepStart = ev.startMins - EVENT_PREP_BUFFER_MINS;
    if (prepStart > wakeMins + 15) {
      const hasPrep = working.some(
        (i) =>
          !isLockedScheduleItem(i) &&
          parseTimeToMins(normalizeTo24h(i.time)) >= prepStart - 2 &&
          parseTimeToMins(normalizeTo24h(i.time)) <= ev.startMins,
      );
      if (!hasPrep) {
        working.push({
          time: minsToTime24(prepStart),
          activity: "Get ready & transition",
          duration: EVENT_PREP_BUFFER_MINS,
          category: "rest",
          status: "pending",
          notes: `Short buffer before ${ev.activity}.`,
        });
      }
    }
    working.push(buildSpecialEventScheduleItem(ev));
  }

  return shiftNonLockedAroundLockedEvents(working).items;
}

function validateOneSpecialEventPlacement(
  items: RoutineScheduleItem[],
  event: ParsedSpecialEvent,
  opts: {
    wakeMins: number;
    sleepMins: number;
    schoolStartMins?: number;
    schoolEndMins?: number;
    hasSchool?: boolean;
  },
): string[] {
  const warnings: string[] = [];
  const match = items.find(
    (i) =>
      isLockedSpecialEvent(i) &&
      (i.activity.toLowerCase() === event.activity.toLowerCase() ||
        isProbableDuplicateOfEvent(i, event)),
  );

  if (!match) {
    warnings.push(`special-event: not found in final schedule — ${event.activity}`);
    return warnings;
  }

  const start = parseTimeToMins(normalizeTo24h(match.time));
  const end = start + (match.duration ?? event.duration);

  if (Math.abs(start - event.startMins) > 20) {
    warnings.push(`special-event: "${event.activity}" time drifted from plan`);
  }
  if (start < opts.wakeMins) {
    warnings.push(`special-event: "${event.activity}" starts before wake window`);
  }
  if (start >= opts.sleepMins) {
    warnings.push(`special-event: "${event.activity}" starts at or after bedtime`);
  }

  if (
    opts.hasSchool &&
    opts.schoolStartMins != null &&
    opts.schoolEndMins != null &&
    start < opts.schoolEndMins &&
    end > opts.schoolStartMins
  ) {
    warnings.push(`special-event: "${event.activity}" overlaps school block`);
  }

  const sleepItem = items.find((i) => /lights out|sleep/i.test(i.activity));
  if (sleepItem) {
    const sleepStart = parseTimeToMins(normalizeTo24h(sleepItem.time));
    if (start >= sleepStart || end > sleepStart) {
      warnings.push(`special-event: "${event.activity}" overlaps sleep`);
    }
  }

  return warnings;
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
  const events = event ? [event] : [];
  return validateSpecialEventsPlacement(items, events, opts);
}

export function validateSpecialEventsPlacement(
  items: RoutineScheduleItem[],
  events: ParsedSpecialEvent[],
  opts: {
    wakeMins: number;
    sleepMins: number;
    schoolStartMins?: number;
    schoolEndMins?: number;
    hasSchool?: boolean;
  },
): SpecialEventDebug {
  if (!events.length) {
    return {
      eventDetected: false,
      eventTime: null,
      eventType: null,
      eventActivity: null,
      eventPlacementStatus: "skipped",
      validationWarnings: [],
      eventCount: 0,
      eventTimes: [],
    };
  }

  const warnings: string[] = [];
  for (const event of events) {
    warnings.push(...validateOneSpecialEventPlacement(items, event, opts));
  }

  const first = events[0]!;
  const placementStatus: SpecialEventPlacementStatus =
    warnings.length === 0 ? "success" : "fallback";

  return {
    eventDetected: true,
    eventTime: minsToTime24(first.startMins),
    eventType: first.type,
    eventActivity: events.length === 1 ? first.activity : `${events.length} events`,
    eventPlacementStatus: placementStatus,
    validationWarnings: warnings,
    eventCount: events.length,
    eventTimes: events.map((e) => minsToTime24(e.startMins)),
  };
}

const GAP_AFTER_EVENT = 10;
const MIN_ACTIVITY_MINS = 10;

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

function normalizeEventsArg(
  events: ParsedSpecialEvent | ParsedSpecialEvent[] | null | undefined,
): ParsedSpecialEvent[] {
  if (!events) return [];
  return Array.isArray(events) ? events : [events];
}

/**
 * Re-insert parsed special events if post-processing dropped them; resolve overlaps.
 */
export function ensureSpecialEventsPreserved(
  items: RoutineScheduleItem[],
  events: ParsedSpecialEvent | ParsedSpecialEvent[] | null | undefined,
  bounds: { wakeMins: number; sleepMins: number },
): RoutineScheduleItem[] {
  const list = normalizeEventsArg(events);
  let working = [...items];

  for (const ev of list) {
    working = working.filter((i) => !isProbableDuplicateOfEvent(i, ev));
  }

  const cleaned = cleanupBlocksBeforeEvents(working, list);
  working = cleaned.items;

  for (const ev of list) {
    const present = working.some(
      (i) => isLockedSpecialEvent(i) && isProbableDuplicateOfEvent(i, ev),
    );
    if (!present) {
      working.push(buildSpecialEventScheduleItem(ev));
    }
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
      const end = start + dur;
      if (end <= sleepStart) continue;
      if (start >= sleepStart) continue;
      const maxDur = sleepStart - start - 5;
      if (maxDur >= MIN_ACTIVITY_MINS) {
        it.duration = maxDur;
        continue;
      }
      dur = Math.min(dur, windDownDur);
      start = sleepStart - dur - 5;
      it.time = minsToTime24(Math.max(bounds.wakeMins + 30, start));
      it.duration = Math.min(dur, sleepStart - parseTimeToMins(it.time) - 5);
    }
  }

  working = resolveTimelineOverlaps(working, bounds.wakeMins, bounds.sleepMins);
  return resolveTimelineOverlaps(working, bounds.wakeMins, bounds.sleepMins);
}
