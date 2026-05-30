function envFlag(key: string, defaultValue = true): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true";
}

/** Infant UX v2 — Baby Today, deduped hub, dashboard shortcut. */
export const FF_INFANT_V2 = envFlag("VITE_FF_INFANT_V2", true);

/** Co-parent invite + shared logs. */
export const FF_INFANT_COPARENT = envFlag("VITE_FF_INFANT_COPARENT", true);

/** Smart push reminders for nap/feed/vaccine. */
export const FF_INFANT_NOTIFICATIONS = envFlag("VITE_FF_INFANT_NOTIFICATIONS", true);
