const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayLabelFromRoutineDate(date: string): (typeof WEEKDAY_LABELS)[number] {
  const dow = new Date(date + "T12:00:00").getDay();
  return WEEKDAY_LABELS[dow] ?? "Mon";
}
