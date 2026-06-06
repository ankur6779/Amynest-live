function envFlag(key: string, defaultValue = true): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true";
}

/** Infant UX v2 — Baby Today, deduped hub, dashboard shortcut. */
export const FF_INFANT_V2 = envFlag("VITE_FF_INFANT_V2", true);

/** Infant premium layer — Baby Expert quota (3/day default, env-configurable), contextual Amy CTAs. */
export const FF_INFANT_PREMIUM = envFlag("VITE_FF_INFANT_PREMIUM", true);

/**
 * Infant AI daily limit A/B: set VITE_INFANT_AI_DAILY_LIMIT (client fallback) and
 * INFANT_AI_DAILY_LIMIT on the API server. Both default to 3 when unset.
 */
