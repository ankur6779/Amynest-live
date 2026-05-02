// ─────────────────────────────────────────────────────────────────────────
// Family-mode preview helpers shared between web (kidschedule) and mobile
// (amynest-mobile). Pure TS — no React, no platform deps.
// ─────────────────────────────────────────────────────────────────────────

export type FRTimelineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
};

export type FRTimelineChild = {
  id: number;
  name: string;
  foodType?: string;
};

export type FRTimelineRoutine = {
  title: string;
  items: FRTimelineItem[];
};

export type FRTimelineFamilyResult = {
  child: FRTimelineChild;
  routine: FRTimelineRoutine;
};

/** "7:00 AM" → minutes since midnight (-1 on garbage, matches web behaviour). */
export function parseTimeToMinutes(t: string): number {
  if (!t) return -1;
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const minutes = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + minutes;
}

export type TiffinEntry = {
  child: FRTimelineChild;
  time: string;
  options: string[];
};

/**
 * Extract the tiffin row from each child's routine and parse the
 * pipe-separated `Options:` notes field into a list of meal options.
 * Children without a tiffin row are dropped.
 */
export function extractTiffinSummary(
  familyResults: FRTimelineFamilyResult[],
): TiffinEntry[] {
  const out: TiffinEntry[] = [];
  for (const { child, routine } of familyResults) {
    const item = routine.items.find((i) => i.category === "tiffin");
    if (!item) continue;
    const options = item.notes?.startsWith("Options:")
      ? item.notes
          .replace("Options:", "")
          .split("|")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];
    out.push({ child, time: item.time, options });
  }
  return out;
}

export type CombinedTimelineRow = FRTimelineItem & {
  childName: string;
  childId: number;
  /** 0-based index used to pick a colour from the per-child palette. */
  colorIdx: number;
};

/**
 * Build the family combined timeline: every child's items merged together
 * and sorted chronologically. Each row carries the originating child's
 * name + a stable colour index (mod over the caller's palette).
 */
export function buildCombinedTimeline(
  familyResults: FRTimelineFamilyResult[],
): CombinedTimelineRow[] {
  const rows: CombinedTimelineRow[] = [];
  familyResults.forEach(({ child, routine }, ci) => {
    routine.items.forEach((item) => {
      rows.push({
        ...item,
        childName: child.name,
        childId: child.id,
        colorIdx: ci,
      });
    });
  });
  rows.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  return rows;
}
