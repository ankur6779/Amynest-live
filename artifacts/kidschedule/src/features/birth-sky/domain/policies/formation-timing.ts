/**
 * Formation duration bucket (Pack 3 Addendum A). Analytics export uses bucket only.
 */

export type FormationDurationBucket = "<3s" | "3–5s" | "5–10s" | "10s+";

export function formationDurationBucket(durationMs: number): FormationDurationBucket {
  if (durationMs < 3000) return "<3s";
  if (durationMs < 5000) return "3–5s";
  if (durationMs < 10000) return "5–10s";
  return "10s+";
}
