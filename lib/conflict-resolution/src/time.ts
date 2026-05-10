// ─────────────────────────────────────────────────────────────────────────
// Time helpers — both 12h ("H:MM AM/PM") and 24h ("HH:MM") supported.
// All internal arithmetic is in minutes-since-midnight.
// ─────────────────────────────────────────────────────────────────────────

/** Parse "7:00 AM", "7:00 am", "07:00", or "19:30" → minutes-since-midnight.
 *  Returns -1 on parse failure. */
export function parseTime(t: string | null | undefined): number {
  if (!t) return -1;
  const cleaned = t.replace(/\s+/g, " ").trim();
  // 12-hour
  const m12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    if (m12[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m12[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }
  // 24-hour
  const m24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return -1;
    return h * 60 + min;
  }
  return -1;
}

/** Minutes-since-midnight → "H:MM AM/PM". */
export function formatTime12(mins: number): string {
  const w = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(w / 60);
  const m = w % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Minutes → "HH:MM" 24h. */
export function formatTime24(mins: number): string {
  const w = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(w / 60);
  const m = w % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** True when interval [aStart,aEnd) overlaps [bStart,bEnd). Half-open. */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Length of overlap in minutes (0 if disjoint). */
export function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
