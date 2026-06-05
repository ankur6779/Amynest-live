/** Timeline helpers for routine detail — time parsing, labels, task state. */

export type TimelineTaskPhase = "past" | "current" | "upcoming" | "neutral";

export function parseRoutineTimeToMinutes(timeStr: string): number {
  const t = timeStr.trim();
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]!, 10);
    const min = parseInt(m12[2]!, 10);
    const ampm = m12[3]!.toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1]!, 10);
    const min = parseInt(m24[2]!, 10);
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
  }
  return -1;
}

/**
 * Single canonical display format for every routine time across the app:
 * 12-hour clock with AM/PM (e.g. "4:25 PM"). The API may persist times as
 * 24-hour ("16:25") or 12-hour ("4:25 PM"); this normalizes both so no surface
 * ever shows a mix. Unparseable values are returned trimmed and unchanged.
 */
export function formatRoutineTime(time: string | null | undefined): string {
  if (!time) return "";
  const mins = parseRoutineTimeToMinutes(time);
  if (mins < 0) return time.trim();
  const wrapped = ((mins % 1440) + 1440) % 1440;
  let h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** "30m" for display, or "" when there is no real duration (e.g. sleep anchor). */
export function formatRoutineDurationShort(
  item: { duration?: number | null } | null | undefined,
): string {
  const d = typeof item?.duration === "number" ? item.duration : 0;
  return d > 0 ? `${d}m` : "";
}

/** "30 min" for share/notification text, or "" when there is no real duration. */
export function formatRoutineDurationLong(
  item: { duration?: number | null } | null | undefined,
): string {
  const d = typeof item?.duration === "number" ? item.duration : 0;
  return d > 0 ? `${d} min` : "";
}

// Internal engineering markers (e.g. "hydration:", "trust-feeding:", "aqi:")
// that must never leak into shared/exported text. They always use a colon, and
// a trust/feeding marker can carry a sub-token ("trust-feeding:").
const INTERNAL_NOTE_PREFIX =
  /^(hydration|aqi|trust[\w-]*|display|debug|internal|meta|pipeline)\s*:\s*/i;

/**
 * Clean an item's notes for sharing/export: drop internal engineering prefixes
 * and render the meal "Options:" pipe-list as a readable comma list. Returns ""
 * when nothing parent-facing remains.
 */
export function cleanRoutineNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  let text = notes.trim();
  if (!text) return "";
  if (INTERNAL_NOTE_PREFIX.test(text)) {
    text = text.replace(INTERNAL_NOTE_PREFIX, "").trim();
  }
  text = text.replace(/\bOptions:\s*/i, "Options: ").replace(/\s*\|\s*/g, ", ");
  return text.replace(/\s+/g, " ").trim();
}

const CATEGORY_LABELS: Record<string, string> = {
  morning: "Morning",
  meal: "Meal",
  school: "School",
  travel: "Travel",
  homework: "Homework",
  study: "Study",
  play: "Play",
  exercise: "Exercise",
  screen: "Screen time",
  hygiene: "Hygiene",
  sleep: "Sleep",
  "wind-down": "Wind-down",
  bonding: "Bonding",
  tiffin: "Tiffin",
  creative: "Creative",
  outdoor: "Outdoor",
  family: "Family",
  rest: "Rest",
  self_care: "Self care",
  reading: "Reading",
  wind_down: "Wind-down",
  outdoor_play: "Outdoor play",
  free_play: "Free play",
  quiet_time: "Quiet time",
  snack: "Snack",
  nap: "Nap",
  learning: "Learning",
  chores: "Chores",
  bath: "Bath",
  routine: "Routine",
};

export function formatCategoryLabel(category: string): string {
  const key = (category ?? "").toLowerCase().trim();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key]!;
  const partial = Object.keys(CATEGORY_LABELS).find((k) => key.includes(k));
  if (partial) return CATEGORY_LABELS[partial]!;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isSleepRoutineItem(category: string, activity: string): boolean {
  const cat = (category ?? "").toLowerCase();
  return cat === "sleep" || /\b(lights out|bedtime|sleep time|good night)\b/i.test(activity);
}

export function formatMinutesUntil(deltaMins: number): string {
  if (deltaMins <= 0) return "now";
  if (deltaMins < 60) return `${deltaMins}m`;
  const h = Math.floor(deltaMins / 60);
  const m = deltaMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function resolveTimelinePhase(params: {
  dateMode: "past" | "today" | "future";
  status: string;
  taskStart: number;
  taskEnd: number;
  nowMins: number;
  isCurrentIndex: boolean;
}): TimelineTaskPhase {
  const { dateMode, status, taskStart, taskEnd, nowMins, isCurrentIndex } = params;
  if (dateMode !== "today" || status !== "pending") return "neutral";
  if (taskStart < 0) return "neutral";
  if (isCurrentIndex || (taskStart <= nowMins && nowMins < taskEnd)) return "current";
  if (taskEnd <= nowMins) return "past";
  if (taskStart > nowMins) return "upcoming";
  return "neutral";
}

export const LINKED_MODULE_LABELS: Record<string, string> = {
  parent_focus_guide: "Focus guide",
  amy_coach_study_tips: "Amy Coach",
  benefits_of_play: "Benefits of play",
  activity_ideas: "Activity ideas",
  family_bonding_ideas: "Family bonding",
  phonics_audio: "Phonics audio",
  story_audio: "Story audio",
};

export function linkedModuleLabel(moduleId: string): string {
  return LINKED_MODULE_LABELS[moduleId] ?? "Parent Hub";
}
