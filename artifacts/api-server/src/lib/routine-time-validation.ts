/**
 * Centralized clock-time validation for routine generation.
 * Rejects malformed values (abc, 25:99) and normalizes safe 12h/24h inputs to HH:MM.
 */

export type ValidateAndNormalizeTimeOptions = {
  /** Used when input is missing, unparseable, or out of range. */
  fallback?: string;
  /** Optional label for debug / resolution traces. */
  field?: string;
};

export type TimeValidationResult = {
  /** Normalized 24-hour time HH:MM */
  time: string;
  /** True when input was parsed and within valid clock bounds */
  valid: boolean;
  /** True when fallback was applied */
  sanitized: boolean;
  reason?: string;
};

const DEFAULT_FALLBACK = "07:00";

function resolveFallbackOption(raw?: string): string {
  const candidate = (raw ?? DEFAULT_FALLBACK).trim();
  if (!candidate) return DEFAULT_FALLBACK;
  const m12 = candidate.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]!, 10);
    const min = parseInt(m12[2]!, 10);
    if (h >= 1 && h <= 12 && min >= 0 && min <= 59) {
      const ap = m12[3]!.toUpperCase();
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return format24(h, min);
    }
  }
  const m24 = candidate.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1]!, 10);
    const min = parseInt(m24[2]!, 10);
    if (isValidClock(h, min)) return format24(h, min);
  }
  return DEFAULT_FALLBACK;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isValidClock(h: number, m: number): boolean {
  return (
    Number.isFinite(h) &&
    Number.isFinite(m) &&
    h >= 0 &&
    h <= 23 &&
    m >= 0 &&
    m <= 59
  );
}

function format24(h: number, m: number): string {
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Validate and normalize a wake/sleep/school time string.
 * Never returns out-of-range clock values.
 */
export function validateAndNormalizeTime(
  raw: string | null | undefined,
  options: ValidateAndNormalizeTimeOptions = {},
): TimeValidationResult {
  const fallback = resolveFallbackOption(options.fallback);
  const field = options.field;

  if (raw == null || String(raw).trim() === "") {
    return {
      time: fallback,
      valid: false,
      sanitized: true,
      reason: field ? `${field}: empty` : "empty",
    };
  }

  const cleaned = String(raw).replace(/\s+/g, " ").trim();

  const m12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]!, 10);
    const min = parseInt(m12[2]!, 10);
    const ap = m12[3]!.toUpperCase();
    if (h < 1 || h > 12 || min < 0 || min > 59) {
      return {
        time: fallback,
        valid: false,
        sanitized: true,
        reason: field ? `${field}: invalid 12h time "${cleaned}"` : `invalid 12h "${cleaned}"`,
      };
    }
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return { time: format24(h, min), valid: true, sanitized: false };
  }

  const m24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1]!, 10);
    const min = parseInt(m24[2]!, 10);
    if (!isValidClock(h, min)) {
      return {
        time: fallback,
        valid: false,
        sanitized: true,
        reason: field
          ? `${field}: out-of-range 24h "${cleaned}"`
          : `out-of-range 24h "${cleaned}"`,
      };
    }
    return { time: format24(h, min), valid: true, sanitized: false };
  }

  return {
    time: fallback,
    valid: false,
    sanitized: true,
    reason: field ? `${field}: unparseable "${cleaned}"` : `unparseable "${cleaned}"`,
  };
}

/** Quick guard for already-normalized HH:MM strings. */
export function isValidClockTime24(t: string): boolean {
  return validateAndNormalizeTime(t, { fallback: "00:00" }).valid;
}
