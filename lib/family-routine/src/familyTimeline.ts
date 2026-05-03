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
  /** Index of this item within its originating child's `routine.items` —
   * used by editable previews to mutate the right row. */
  itemIdx: number;
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
    routine.items.forEach((item, ii) => {
      rows.push({
        ...item,
        childName: child.name,
        childId: child.id,
        colorIdx: ci,
        itemIdx: ii,
      });
    });
  });
  rows.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  return rows;
}

// ─── Editable-preview helpers ────────────────────────────────────────────
// The mobile family-preview lets parents tweak the generated routines
// before pressing "Save All". These pure helpers mutate one child's
// `routine.items` array immutably and are shared with web for parity.

function minsTo12h(total: number): string {
  const w = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(w / 60);
  const m = w % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Apply the parent's tiffin pick to this child's items: the chosen option
 * becomes the tiffin row's `activity`. The notes "Options:" list is left
 * untouched so the alternatives stay re-pickable.
 */
export function applyTiffinSelection(
  items: FRTimelineItem[],
  option: string,
): FRTimelineItem[] {
  return items.map((it) =>
    it.category === "tiffin" ? { ...it, activity: option } : it,
  );
}

/**
 * Shift the item at `idx` by `deltaMinutes` (positive = later, negative =
 * earlier). Wraps around midnight via `minsTo12h`. Returns the original
 * array unchanged if the index is out of range or the time is unparseable.
 */
export function shiftItemTime(
  items: FRTimelineItem[],
  idx: number,
  deltaMinutes: number,
): FRTimelineItem[] {
  if (idx < 0 || idx >= items.length) return items;
  const cur = parseTimeToMinutes(items[idx].time);
  if (cur < 0) return items;
  const next = [...items];
  next[idx] = { ...next[idx], time: minsTo12h(cur + deltaMinutes) };
  return next;
}

/** Drop the item at `idx`. */
export function removeItemAt(
  items: FRTimelineItem[],
  idx: number,
): FRTimelineItem[] {
  if (idx < 0 || idx >= items.length) return items;
  return items.filter((_, i) => i !== idx);
}
