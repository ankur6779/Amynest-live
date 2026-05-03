// ─────────────────────────────────────────────────────────────────────────
// Parent availability + wake-time helpers shared between web (kidschedule)
// and mobile (amynest-mobile). Pure TS — no platform deps.
//
// The shape mirrors what the server expects in `GenerateRoutineBody`
// (see lib/api-spec/openapi.yaml: parent1Role / parent1WorkType /
// parent1IsWorking / parent1WorkHours and the parent2 mirror).
// ─────────────────────────────────────────────────────────────────────────

export type WorkType = "work_from_home" | "work_from_office" | "homemaker";

export type ParentAvailEntry = {
  role: string;
  workType: WorkType | null;
  isWorking: boolean | null;
  workHours: string;
};

export type ParentAvailData = {
  p1: ParentAvailEntry;
  p2: ParentAvailEntry | null;
  hasSecondParent: boolean;
};

export const DEFAULT_P1: ParentAvailEntry = {
  role: "Mother",
  workType: null,
  isWorking: null,
  workHours: "",
};

export const DEFAULT_P2: ParentAvailEntry = {
  role: "Father",
  workType: null,
  isWorking: null,
  workHours: "",
};

export const AVAIL_KEY = (date: string): string => `amynest_parent_avail_${date}`;
export const WAKE_KEY = (childId: number, date: string): string =>
  `amynest_wake_${childId}_${date}`;

export function defaultAvailability(): ParentAvailData {
  return { p1: { ...DEFAULT_P1 }, p2: null, hasSecondParent: false };
}

/**
 * Server-bound payload for the `parent*` fields on `/routines/generate`.
 * Returns `undefined` for any field that isn't applicable so callers can
 * spread it into the request body without sending stale values.
 */
export function buildParentAvailPayload(avail: ParentAvailData): {
  parent1Role?: string;
  parent1WorkType?: WorkType;
  parent1IsWorking?: boolean;
  parent1WorkHours?: string;
  parent2Role?: string;
  parent2WorkType?: WorkType;
  parent2IsWorking?: boolean;
  parent2WorkHours?: string;
} {
  const p1 = avail.p1;
  const p2 = avail.hasSecondParent ? avail.p2 : null;
  return {
    parent1Role: p1.role || undefined,
    parent1WorkType: p1.workType || undefined,
    parent1IsWorking:
      p1.workType !== "homemaker" && p1.isWorking !== null ? p1.isWorking : undefined,
    parent1WorkHours:
      p1.workType !== "homemaker" && p1.isWorking ? p1.workHours || undefined : undefined,
    parent2Role: p2?.role || undefined,
    parent2WorkType: p2?.workType || undefined,
    parent2IsWorking:
      p2 && p2.workType !== "homemaker" && p2.isWorking !== null ? p2.isWorking : undefined,
    parent2WorkHours:
      p2 && p2.workType !== "homemaker" && p2.isWorking
        ? p2.workHours || undefined
        : undefined,
  };
}

/**
 * Build the per-child request body for `POST /routines/generate` when used
 * inside the family (multi-child) flow. Web and mobile share this so the
 * payload shape stays in sync — any field added to the server's
 * GenerateRoutineBody only needs to be wired in once here.
 *
 * Spread the result directly into the mutation/fetch body.
 */
export function buildFamilyChildGeneratePayload(opts: {
  child: {
    id: number;
    age: number;
    wakeUpTime?: string | null;
    schoolStartTime?: string | null;
    schoolEndTime?: string | null;
  };
  date: string;
  hasSchool?: boolean | null;
  /** Already augmented with handler suffix via `appendHandlerToPlans`. */
  specialPlans: string;
  fridgeItems?: string;
  region?: string | null;
  parentAvail: ParentAvailData;
}): Record<string, unknown> {
  return {
    childId: opts.child.id,
    date: opts.date,
    hasSchool: opts.hasSchool ?? undefined,
    specialPlans: opts.specialPlans,
    fridgeItems: opts.fridgeItems?.trim() || undefined,
    age: opts.child.age,
    wakeTime: opts.child.wakeUpTime ?? undefined,
    schoolStart: opts.child.schoolStartTime ?? undefined,
    schoolEnd: opts.child.schoolEndTime ?? undefined,
    region: opts.region ?? undefined,
    ...buildParentAvailPayload(opts.parentAvail),
  };
}

export function isParentAvailComplete(entry: ParentAvailEntry): boolean {
  if (!entry.workType) return false;
  if (entry.workType === "homemaker") return true;
  return entry.isWorking !== null;
}

export function parentStatusLabel(entry: ParentAvailEntry): string {
  if (!entry.workType) return "Not set";
  if (entry.workType === "homemaker") return "Free all day 🏠";
  if (entry.isWorking === true)
    return entry.workHours ? `Busy (${entry.workHours}) 💼` : "Busy today 💼";
  if (entry.isWorking === false) return "Holiday — free all day 🎉";
  return "Work schedule not answered";
}

// ─── Time helpers ─────────────────────────────────────────────────────────

/** "7:00 AM" → total minutes since midnight (-1 on parse failure). */
export function parseDisplayTime(t: string): number {
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Total minutes → "H:MM AM/PM". */
export function minsToDisplay(total: number): string {
  const w = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(w / 60);
  const m = w % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** "HH:MM" (24-hour) → "H:MM AM/PM". */
export function inputToDisplay(hm: string): string {
  const parts = hm.split(":");
  if (parts.length < 2) return "";
  let h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** "H:MM AM/PM" → "HH:MM" (24-hour). */
export function displayToInput(t: string): string {
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "07:00";
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

export type ShiftableItem = { time: string; activity: string; category: string };

/**
 * Shift all non-sleep items by the delta between the child's default wake
 * time and the actual wake time the parent confirmed. Sleep / bedtime items
 * stay anchored so they don't drift.
 */
export function shiftRoutineItems<T extends ShiftableItem>(
  items: T[],
  defaultWake: string,
  actualWake: string,
): T[] {
  const defMins = parseDisplayTime(defaultWake);
  const actMins = parseDisplayTime(actualWake);
  if (defMins < 0 || actMins < 0 || defMins === actMins) return items;
  const diff = actMins - defMins;
  return items.map((item) => {
    if (item.category === "sleep" || /sleep|bedtime|good night/i.test(item.activity)) return item;
    const newMins = parseDisplayTime(item.time) + diff;
    if (newMins < 0) return item;
    return { ...item, time: minsToDisplay(newMins) };
  });
}

/** Detect essential tasks (brushing, meals, hygiene, sleep) — used by the
 * "did you already do X?" past-task confirmation flow on `today`. */
export function isEssentialTask(activity: string, category: string): boolean {
  return (
    /brush|breakfast|lunch|dinner|snack|meal|eat|morning|wake|bath|hygiene|toilet|tiffin/i.test(
      activity,
    ) ||
    ["meal", "hygiene", "tiffin", "morning"].includes((category ?? "").toLowerCase())
  );
}

// ─── Region picker ────────────────────────────────────────────────────────
// Mirrors the regions Amy AI knows about (server prompts.ts). Kept as a
// const-array so the UI can render localized labels alongside the value.
export const REGION_OPTIONS = [
  { value: "north_indian", label: "North Indian", emoji: "🌾" },
  { value: "south_indian", label: "South Indian", emoji: "🥥" },
  { value: "bengali", label: "Bengali", emoji: "🐟" },
  { value: "gujarati", label: "Gujarati", emoji: "🥗" },
  { value: "maharashtrian", label: "Maharashtrian", emoji: "🌶️" },
  { value: "punjabi", label: "Punjabi", emoji: "🫓" },
  { value: "pan_indian", label: "Pan Indian", emoji: "🇮🇳" },
  { value: "global", label: "Global / Mixed", emoji: "🌍" },
] as const;

export type RegionValue = (typeof REGION_OPTIONS)[number]["value"];
