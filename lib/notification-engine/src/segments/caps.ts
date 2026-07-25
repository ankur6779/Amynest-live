import type { AudienceSegment } from "./types.js";

export interface SegmentCapInput {
  segment: AudienceSegment;
  /** Non-critical CRM sends already delivered today (engagement + conversion). */
  crmNonCriticalSentToday: number;
  /** Routine / milestone / critical sends today — excluded from CRM cap. */
  maxNonCriticalPerDay?: number;
}

export interface SegmentCapResult {
  allowed: boolean;
  reason: string;
  remaining: number;
}

const DEFAULT_MAX = 2;

/** Segments that never receive monetization pushes. */
export const MONETIZATION_BLOCKED_SEGMENTS: ReadonlySet<AudienceSegment> = new Set([
  "INSTALLED_NEVER_REGISTERED",
  "REGISTERED_NO_ROUTINE",
  "INACTIVE_USERS",
  "PREMIUM_USERS",
  "REGISTERED_ACTIVE",
]);

/**
 * CRM segment frequency cap — max non-critical pushes per local day.
 * Critical routine reminders bypass this (handled by caller).
 */
export function evaluateSegmentCap(input: SegmentCapInput): SegmentCapResult {
  const max = input.maxNonCriticalPerDay ?? DEFAULT_MAX;
  const remaining = Math.max(0, max - input.crmNonCriticalSentToday);
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: "segment_daily_cap",
      remaining: 0,
    };
  }
  return {
    allowed: true,
    reason: "within_cap",
    remaining,
  };
}

export function isMonetizationAllowedForSegment(
  segment: AudienceSegment,
  stepCategory: "engagement" | "conversion",
): boolean {
  if (stepCategory !== "conversion") return true;
  return !MONETIZATION_BLOCKED_SEGMENTS.has(segment);
}
