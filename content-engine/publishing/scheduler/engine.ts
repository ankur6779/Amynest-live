import type {
  ScheduleMode,
  SchedulePlan,
  SchedulePolicy,
  VideoVisibility,
} from "../../types/published-video.js";

export interface BuildScheduleInput {
  policy: SchedulePolicy;
  visibility: VideoVisibility;
  modeOverride?: ScheduleMode;
  /** Explicit ISO publish timestamp. */
  publishAt?: string;
  /** Base daily upload time HH:mm from engine config. */
  uploadTime: string;
  now?: Date;
}

/** Build a timezone-aware schedule plan for upload/publish. */
export function buildSchedulePlan(input: BuildScheduleInput): SchedulePlan {
  const mode = input.modeOverride ?? input.policy.mode;
  const timezone = input.policy.timezone;

  if (mode === "draft") {
    return {
      mode: "draft",
      visibility: "draft",
      publishAt: null,
      timezone,
    };
  }

  if (mode === "scheduled") {
    const publishAt =
      input.publishAt ??
      resolveScheduledPublishAt({
        uploadTime: input.uploadTime,
        timezone,
        offsetMinutes: input.policy.uploadOffsetMinutes,
        now: input.now,
      });
    return {
      mode: "scheduled",
      visibility: input.visibility === "draft" ? "private" : input.visibility,
      publishAt,
      timezone,
    };
  }

  return {
    mode: "immediate",
    visibility: input.visibility === "draft" ? "private" : input.visibility,
    publishAt: (input.now ?? new Date()).toISOString(),
    timezone,
  };
}

export function resolveScheduledPublishAt(input: {
  uploadTime: string;
  timezone: string;
  offsetMinutes: number;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const [hh, mm] = input.uploadTime.split(":").map(Number);
  const local = zonedParts(now, input.timezone);
  let totalMinutes = (hh ?? 0) * 60 + (mm ?? 0) + input.offsetMinutes;
  let dayOffset = 0;
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    dayOffset -= 1;
  }
  while (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60;
    dayOffset += 1;
  }
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  let year = local.year;
  let month = local.month;
  let day = local.day + dayOffset;

  // If the computed local time has already passed today, schedule for tomorrow.
  const candidateMs = zonedLocalToUtcMs({
    year,
    month,
    day,
    hour,
    minute,
    timezone: input.timezone,
  });
  if (candidateMs <= now.getTime()) {
    day += 1;
  }

  const normalized = normalizeYmd(year, month, day);
  return new Date(
    zonedLocalToUtcMs({
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour,
      minute,
      timezone: input.timezone,
    }),
  ).toISOString();
}

function zonedParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function zonedLocalToUtcMs(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: string;
}): number {
  // Binary search UTC instant that formats to the desired local wall time.
  let low = Date.UTC(input.year, input.month - 1, input.day - 1, 0, 0, 0);
  let high = Date.UTC(input.year, input.month - 1, input.day + 1, 23, 59, 59);
  const target = `${input.year}-${pad(input.month)}-${pad(input.day)}T${pad(input.hour)}:${pad(input.minute)}`;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const parts = zonedParts(new Date(mid), input.timezone);
    const current = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
    if (current === target) return mid;
    if (current < target) low = mid + 60_000;
    else high = mid - 60_000;
  }
  return Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
}

function normalizeYmd(
  year: number,
  month: number,
  day: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
