import type { ScheduleItem } from "../../lib/routine-templates.js";

function isValidOptionsNote(notes: string | undefined): boolean {
  if (!notes || !notes.startsWith("Options:")) return false;
  const opts = notes
    .replace("Options:", "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  return opts.length >= 4;
}

function slotKey(it: ScheduleItem): string {
  return `${(it.category ?? "").toLowerCase()}|${it.time}|${it.activity}`;
}

/**
 * Copy AI `Options:` notes onto the *current* routine items without replacing
 * the live array. Used so a stale enrich job cannot wipe completions/edits
 * that landed while OpenAI was running.
 *
 * - Never changes non-meal/tiffin rows.
 * - Never overwrites a slot that already has a valid Options note.
 * - Matches by index when activity+time align; otherwise by category|time|activity.
 * - Preserves every other live field (status, completedAt, custom notes, etc.).
 */
export function mergeOptionsNotesOntoLiveItems(
  liveItems: ScheduleItem[],
  enrichedItems: ScheduleItem[],
): ScheduleItem[] {
  if (!Array.isArray(liveItems) || liveItems.length === 0) return liveItems;
  if (!Array.isArray(enrichedItems) || enrichedItems.length === 0) return liveItems;

  const byKey = new Map<string, ScheduleItem>();
  for (const it of enrichedItems) {
    const cat = (it.category ?? "").toLowerCase();
    if (cat !== "meal" && cat !== "tiffin") continue;
    if (!isValidOptionsNote(it.notes)) continue;
    byKey.set(slotKey(it), it);
  }

  return liveItems.map((live, idx) => {
    const cat = (live.category ?? "").toLowerCase();
    if (cat !== "meal" && cat !== "tiffin") return live;
    if (isValidOptionsNote(live.notes)) return live;

    const aligned = enrichedItems[idx];
    if (
      aligned &&
      (aligned.category ?? "").toLowerCase() === cat &&
      aligned.time === live.time &&
      aligned.activity === live.activity &&
      isValidOptionsNote(aligned.notes)
    ) {
      return { ...live, notes: aligned.notes };
    }

    const matched = byKey.get(slotKey(live));
    if (matched?.notes) {
      return { ...live, notes: matched.notes };
    }
    return live;
  });
}

export function mealEnrichmentNotesChanged(
  before: ScheduleItem[],
  after: ScheduleItem[],
): boolean {
  if (before.length !== after.length) {
    return after.some((it, i) => it.notes !== before[i]?.notes);
  }
  return after.some((it, i) => it.notes !== before[i]?.notes);
}
