/**
 * Phase 7 — Retention cohort analytics.
 *
 * Pure helpers for bucketing children into cohorts and computing D1 / D7 /
 * D30 retention plus comeback success rate. The host owns the raw event
 * store; this file just operates on plain arrays.
 */

export interface CohortMember {
  childId: number;
  /** ISO date the child started using AmyNest. */
  signupDateIso: string;
  /** ISO dates of recorded active days. */
  activeDates: string[];
  /** Optional flag — whether this child upgraded to premium during the window. */
  isPremium?: boolean;
}

export interface CohortRetention {
  cohortLabel: string;
  size: number;
  d1: number;
  d7: number;
  d30: number;
  premiumConversion: number;
  /** Average sessions per active learner over the first 30 days. */
  averageSessions: number;
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00Z`).getTime();
  const tb = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((tb - ta) / 86400000);
}

/** Returns the ISO Monday of the week the date belongs to. */
export function isoWeekStart(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export function bucketCohort(members: CohortMember[]): Map<string, CohortMember[]> {
  const map = new Map<string, CohortMember[]>();
  for (const m of members) {
    const key = isoWeekStart(m.signupDateIso);
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return map;
}

export function computeCohortRetention(
  label: string,
  members: CohortMember[],
): CohortRetention {
  const size = members.length;
  if (size === 0) {
    return {
      cohortLabel: label,
      size: 0,
      d1: 0,
      d7: 0,
      d30: 0,
      premiumConversion: 0,
      averageSessions: 0,
    };
  }
  let d1 = 0;
  let d7 = 0;
  let d30 = 0;
  let premium = 0;
  let totalSessions = 0;
  for (const m of members) {
    const activeSet = new Set(m.activeDates);
    let hasD1 = false;
    let hasD7 = false;
    let hasD30 = false;
    for (const ad of activeSet) {
      const delta = daysBetween(m.signupDateIso, ad);
      if (delta === 1) hasD1 = true;
      if (delta >= 1 && delta <= 7) hasD7 = true;
      if (delta >= 1 && delta <= 30) {
        hasD30 = true;
        totalSessions += 1;
      }
    }
    if (hasD1) d1 += 1;
    if (hasD7) d7 += 1;
    if (hasD30) d30 += 1;
    if (m.isPremium) premium += 1;
  }
  return {
    cohortLabel: label,
    size,
    d1: d1 / size,
    d7: d7 / size,
    d30: d30 / size,
    premiumConversion: premium / size,
    averageSessions: totalSessions / size,
  };
}

export interface ComebackOutcome {
  childId: number;
  /** ISO date the child became inactive. */
  inactiveSinceIso: string;
  /** ISO date the child returned (or null if they didn't). */
  returnedOnIso: string | null;
}

export function computeComebackSuccessRate(outcomes: ComebackOutcome[]): number {
  if (outcomes.length === 0) return 0;
  const recovered = outcomes.filter((o) => o.returnedOnIso != null).length;
  return recovered / outcomes.length;
}

/** Convenience pipeline. */
export function computeWeeklyCohorts(members: CohortMember[]): CohortRetention[] {
  const buckets = bucketCohort(members);
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, list]) => computeCohortRetention(label, list));
}
