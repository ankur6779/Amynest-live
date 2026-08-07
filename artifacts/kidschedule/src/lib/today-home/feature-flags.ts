/**
 * Today Home V1 — Phase 2 manufacturing flag.
 * Default ON. Set VITE_FF_TODAY_HOME_V1=0 to restore legacy weather-hero dashboard.
 */

export function isTodayHomeV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_TODAY_HOME_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
