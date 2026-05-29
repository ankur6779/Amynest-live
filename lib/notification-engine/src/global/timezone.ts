import type { NotificationCategory } from "@workspace/db";

/** IANA timezone + Intl APIs handle DST transitions automatically. */
export interface LocalDateTimeParts {
  timezone: string;
  localDate: string;
  weekday: number;
  hour: number;
  minute: number;
  nowMins: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getLocalDateTimeParts(
  timezone: string,
  now = new Date(),
): LocalDateTimeParts {
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);

  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10,
  );

  const minute = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      minute: "2-digit",
    }).format(now),
    10,
  );

  return {
    timezone,
    localDate,
    weekday: WEEKDAY_MAP[weekdayShort] ?? 0,
    hour: Number.isNaN(hour) ? 0 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
    nowMins: (Number.isNaN(hour) ? 0 : hour) * 60 + (Number.isNaN(minute) ? 0 : minute),
  };
}

export function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Infer IANA timezone from ISO country code (best-effort default). */
export function defaultTimezoneForCountry(countryCode: string | null | undefined): string {
  const cc = (countryCode ?? "").toUpperCase();
  const map: Record<string, string> = {
    US: "America/New_York",
    CA: "America/Toronto",
    GB: "Europe/London",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    ES: "Europe/Madrid",
    PT: "Europe/Lisbon",
    BR: "America/Sao_Paulo",
    MX: "America/Mexico_City",
    AE: "Asia/Dubai",
    SA: "Asia/Riyadh",
    IN: "Asia/Kolkata",
    JP: "Asia/Tokyo",
    KR: "Asia/Seoul",
    ID: "Asia/Jakarta",
    AU: "Australia/Sydney",
    NZ: "Pacific/Auckland",
    SG: "Asia/Singapore",
    CN: "Asia/Shanghai",
  };
  return map[cc] ?? "UTC";
}

export function inLocalQuietHours(
  timezone: string,
  quietStart: string,
  quietEnd: string,
  now = new Date(),
): boolean {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localHHMM = fmt.format(now);
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) {
    return localHHMM >= quietStart && localHHMM < quietEnd;
  }
  return localHHMM >= quietStart || localHHMM < quietEnd;
}
