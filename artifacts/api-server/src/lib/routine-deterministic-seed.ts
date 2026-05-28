/**
 * Deterministic rotation seeds — week-stable variety without randomness.
 */
import { weekKeyFromDate } from "./routine-family-intelligence-store.js";

/** Stable integer from ISO week key + optional salt (same week → same rotation). */
export function weekRotationSeed(routineDate: string, salt = 0): number {
  const wk = weekKeyFromDate(routineDate);
  let n = salt;
  for (let i = 0; i < wk.length; i++) {
    n = (n * 31 + wk.charCodeAt(i)) | 0;
  }
  return Math.abs(n);
}
