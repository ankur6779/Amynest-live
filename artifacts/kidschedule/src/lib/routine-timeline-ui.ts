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
