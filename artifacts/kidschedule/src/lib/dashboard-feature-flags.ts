/**
 * Dashboard layout optimization flags — env-driven for staged rollout.
 * No visual identity changes; order and visibility only.
 */

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/**
 * Production-validated widget priority: continue flow before timeline on mobile,
 * hide redundant resume + low-CTR discovery for engaged parents.
 */
export const FF_DASHBOARD_PRIORITY_ORDER = envFlag(
  "VITE_FF_DASHBOARD_PRIORITY_ORDER",
  false,
);
