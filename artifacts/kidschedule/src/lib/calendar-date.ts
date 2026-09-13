/** Local calendar YYYY-MM-DD — never UTC `toISOString()` for "today". */
export function localCalendarDateKey(now: Date = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
