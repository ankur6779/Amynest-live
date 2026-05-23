import type { TFunction } from "i18next";

export function countdownLabel(daysUntil: number, t: TFunction): string {
  if (daysUntil === 0) return t("screens.event_prep.countdown_today");
  if (daysUntil === 1) return t("screens.event_prep.countdown_tomorrow");
  if (daysUntil <= 7) return t("screens.event_prep.countdown_days", { count: daysUntil });
  if (daysUntil <= 30) return t("screens.event_prep.countdown_weeks", { count: Math.ceil(daysUntil / 7) });
  const months = Math.max(1, Math.round(daysUntil / 30));
  return t("screens.event_prep.countdown_months", { count: months });
}
