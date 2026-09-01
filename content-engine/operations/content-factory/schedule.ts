/**
 * RRULE-equivalent: FREQ=DAILY;INTERVAL=3 from DTSTART 2026-09-02 17:00 Asia/Kolkata.
 * Does not fire before first occurrence. Daily wake-ups are gated here.
 */

import {
  DEFAULT_FACTORY_SCHEDULE,
  type FactoryScheduleConfig,
} from "./types.js";

export interface ScheduleDecision {
  shouldRun: boolean;
  reason: string;
  occurrenceLocal: string | null;
  nextOccurrenceLocal: string;
  dtstartLocal: string;
  daysSinceStart: number | null;
}

function zonedYmdHm(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday ?? "Mon"] ?? 1,
  };
}

function parseLocalDate(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

/** Civil day ordinal (proleptic Gregorian) for date arithmetic without UTC drift. */
function civilDayNumber(y: number, m: number, d: number): number {
  // Howard Hinnant civil_from_days inverse
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

function fromCivilDayNumber(n: number): { y: number; m: number; d: number } {
  const a = n + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d0 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d0) / 4);
  const m0 = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m0 + 2) / 5) + 1;
  const month = m0 + 3 - 12 * Math.floor(m0 / 10);
  const year = 100 * b + d0 - 4800 + Math.floor(m0 / 10);
  return { y: year, m: month, d: day };
}

function formatLocal(y: number, m: number, d: number, hm: string): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${hm} Asia/Kolkata`;
}

export function listUpcomingOccurrences(
  count: number,
  config: FactoryScheduleConfig = DEFAULT_FACTORY_SCHEDULE,
  from: Date = new Date(),
): string[] {
  const start = parseLocalDate(config.dtstartDate);
  const startN = civilDayNumber(start.y, start.m, start.d);
  const z = zonedYmdHm(from, config.timezone);
  const nowN = civilDayNumber(z.year, z.month, z.day);
  const out: string[] = [];
  let i = 0;
  while (out.length < count && i < 5000) {
    const n = startN + i * config.intervalDays;
    const { y, m, d } = fromCivilDayNumber(n);
    if (n > nowN || (n === nowN && `${z.hour}:${String(z.minute).padStart(2, "0")}` < config.localTime)) {
      // include today only if wall clock still before run? for listing "next" we want >= now
    }
    if (n >= nowN) {
      // if today and time already passed, skip to next interval
      if (n === nowN) {
        const [hh, mm] = config.localTime.split(":").map(Number);
        if (z.hour > hh! || (z.hour === hh && z.minute >= mm!)) {
          i += 1;
          continue;
        }
      }
      out.push(formatLocal(y, m, d, config.localTime));
    }
    i += 1;
  }
  return out;
}

/**
 * Decide whether a factory wake-up at `now` should produce.
 * Window: exact local hour:minute match (±0 minutes by default; allow same minute).
 * Interval: days since DTSTART divisible by intervalDays, and not before DTSTART.
 */
export function evaluateFactorySchedule(
  now: Date = new Date(),
  config: FactoryScheduleConfig = DEFAULT_FACTORY_SCHEDULE,
): ScheduleDecision {
  const start = parseLocalDate(config.dtstartDate);
  const startN = civilDayNumber(start.y, start.m, start.d);
  const z = zonedYmdHm(now, config.timezone);
  const nowN = civilDayNumber(z.year, z.month, z.day);
  const dtstartLocal = formatLocal(start.y, start.m, start.d, config.localTime);
  const upcoming = listUpcomingOccurrences(1, config, now);
  const nextOccurrenceLocal = upcoming[0] ?? dtstartLocal;

  if (nowN < startN) {
    return {
      shouldRun: false,
      reason: `Before DTSTART (${dtstartLocal}) — first production is ${nextOccurrenceLocal}`,
      occurrenceLocal: null,
      nextOccurrenceLocal,
      dtstartLocal,
      daysSinceStart: null,
    };
  }

  const daysSinceStart = nowN - startN;
  const onInterval = daysSinceStart % config.intervalDays === 0;
  const [hh, mm] = config.localTime.split(":").map(Number);
  const timeMatch = z.hour === hh && z.minute === mm;

  const occurrenceLocal = formatLocal(z.year, z.month, z.day, config.localTime);

  if (!onInterval) {
    return {
      shouldRun: false,
      reason: `Not an INTERVAL=${config.intervalDays} day (daysSinceStart=${daysSinceStart})`,
      occurrenceLocal: null,
      nextOccurrenceLocal,
      dtstartLocal,
      daysSinceStart,
    };
  }

  if (!timeMatch) {
    return {
      shouldRun: false,
      reason: `On schedule day but wall clock ${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")} ≠ ${config.localTime} ${config.timezone}`,
      occurrenceLocal,
      nextOccurrenceLocal: timeMatch ? nextOccurrenceLocal : occurrenceLocal,
      dtstartLocal,
      daysSinceStart,
    };
  }

  return {
    shouldRun: true,
    reason: `Schedule match: ${occurrenceLocal} (RRULE FREQ=DAILY;INTERVAL=${config.intervalDays})`,
    occurrenceLocal,
    nextOccurrenceLocal: listUpcomingOccurrences(1, config, new Date(now.getTime() + 60_000))[0] ?? nextOccurrenceLocal,
    dtstartLocal,
    daysSinceStart,
  };
}

/** Production date key YYYY-MM-DD in factory timezone. */
export function productionDateKey(
  now: Date = new Date(),
  timeZone = DEFAULT_FACTORY_SCHEDULE.timezone,
): string {
  const z = zonedYmdHm(now, timeZone);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}

export function buildIdempotencyKey(goldenScriptId: string, productionDate: string): string {
  return `amynest-${goldenScriptId}-${productionDate}`;
}

/** Offline proof helper: resolve schedule for a synthetic IST instant. */
export function evaluateAtIstWallClock(
  ymd: string,
  hm: string,
  config: FactoryScheduleConfig = DEFAULT_FACTORY_SCHEDULE,
): ScheduleDecision {
  // Construct a UTC instant that formats as ymd hm in Asia/Kolkata via iterative search
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  // IST = UTC+5:30 → UTC = local - 5:30
  const utcGuess = Date.UTC(y!, m! - 1, d!, hh! - 5, mm! - 30, 0);
  let t = utcGuess;
  for (let i = 0; i < 5; i++) {
    const z = zonedYmdHm(new Date(t), config.timezone);
    const targetMin = hh! * 60 + mm!;
    const haveMin = z.hour * 60 + z.minute;
    const dayDelta =
      civilDayNumber(y!, m!, d!) - civilDayNumber(z.year, z.month, z.day);
    t += (dayDelta * 24 * 60 + (targetMin - haveMin)) * 60_000;
  }
  return evaluateFactorySchedule(new Date(t), config);
}
