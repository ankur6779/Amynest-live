import type { EvidenceClass } from "./types.js";

export const MIN_PAID_USERS = 3;
export const MIN_PURCHASE_EVENTS = 5;
export const MIN_COHORT_SIZE = 10;

export function classifyEvidence(input: {
  measured: boolean;
  sampleSize: number;
  minSample?: number;
}): EvidenceClass {
  if (!input.measured) return "not_verified";
  if (input.sampleSize < (input.minSample ?? MIN_PAID_USERS)) return "not_verified";
  return "measured";
}

export function classifyEstimated(sampleSize: number, minSample = MIN_COHORT_SIZE): EvidenceClass {
  if (sampleSize < minSample) return "not_verified";
  if (sampleSize < minSample * 3) return "estimated";
  return "measured";
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function metric(
  key: string,
  label: string,
  value: number | null,
  previous: number | null,
  unit: import("./types.js").FinancialMetric["unit"],
  evidenceClass: EvidenceClass,
  evidence: string,
  note: string | null = null,
): import("./types.js").FinancialMetric {
  return {
    key,
    label,
    value,
    previous,
    changePct: pctChange(value, previous),
    unit,
    evidenceClass,
    evidence,
    note,
  };
}
