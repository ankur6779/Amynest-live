// ─────────────────────────────────────────────────────────────────────────
// Weather-driven activity replacement engine.
//
// Used by the routine generator (rule + AI fallback) to swap or shorten
// outdoor blocks based on the parent's `weatherOutdoor` answer.
//
//   "yes"     → no change.
//   "no"      → outdoor activity replaced by an indoor equivalent + note.
//   "limited" → outdoor activity kept, duration halved (min 10 min) and
//               an indoor backup is appended to the notes.
// ─────────────────────────────────────────────────────────────────────────

export type WeatherOutdoor = "yes" | "no" | "limited";

export type WeatherAdjustableItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
};

const OUTDOOR_CATEGORIES = new Set(["outdoor", "outdoor_play"]);
const OUTDOOR_ACTIVITY_RE =
  /\b(outdoor|park|cycling|cycle ride|bike ride|walk|nature|garden|playground|swim|run|jog|football|cricket|tennis|skating|fresh air)\b/i;

function isOutdoor(item: WeatherAdjustableItem): boolean {
  if (OUTDOOR_CATEGORIES.has(item.category.toLowerCase())) return true;
  return OUTDOOR_ACTIVITY_RE.test(item.activity);
}

const INDOOR_SWAPS: Array<{ test: RegExp; activity: string; notes: string }> = [
  {
    test: /park|playground|outdoor play|fresh air/i,
    activity: "Indoor Free Play",
    notes:
      "Weather isn't friendly for outdoor play today — set up an indoor obstacle course, balloon volleyball, or pillow fort instead.",
  },
  {
    test: /walk|jog|run/i,
    activity: "Indoor Movement Break",
    notes:
      "Outdoor walk swapped for indoor movement — try a 10-minute kid yoga video, dance party, or stair climbing.",
  },
  {
    test: /cycling|cycle|bike/i,
    activity: "Indoor Active Game",
    notes:
      "Cycling moved indoors — Simon Says, freeze dance, or jumping jacks keep the energy up.",
  },
  {
    test: /swim/i,
    activity: "Indoor Sensory Play",
    notes:
      "Pool day cancelled — try a water-bin sensory activity in the bathroom, or a warm bath with toys.",
  },
  {
    test: /football|cricket|tennis|skating/i,
    activity: "Living-Room Sports",
    notes:
      "Sport moved indoors — soft ball + masking-tape goals, or a ball-rolling target game.",
  },
  {
    test: /garden|nature/i,
    activity: "Plant & Nature Craft",
    notes:
      "Garden time swapped for indoor nature craft — leaf rubbings, seed sorting, or a windowsill plant check.",
  },
];

function pickIndoorSwap(activity: string): { activity: string; notes: string } {
  for (const s of INDOOR_SWAPS) {
    if (s.test.test(activity)) return { activity: s.activity, notes: s.notes };
  }
  return {
    activity: "Indoor Activity",
    notes:
      "Outdoor activity moved indoors due to weather — pick something the child enjoys (puzzles, building blocks, drawing).",
  };
}

/**
 * Returns a NEW array (does not mutate input). Items unaffected by weather
 * are returned by reference.
 */
export function applyWeatherAdjustment<T extends WeatherAdjustableItem>(
  items: T[],
  weatherOutdoor: WeatherOutdoor,
): T[] {
  if (weatherOutdoor === "yes") return items;

  return items.map((item) => {
    if (!isOutdoor(item)) return item;

    if (weatherOutdoor === "no") {
      const swap = pickIndoorSwap(item.activity);
      return {
        ...item,
        activity: swap.activity,
        category: "play",
        notes: swap.notes,
      };
    }

    // weatherOutdoor === "limited"
    const halved = Math.max(10, Math.round(item.duration / 2));
    const backup = pickIndoorSwap(item.activity);
    const existingNote = item.notes?.trim();
    const note = `${existingNote ? existingNote + " " : ""}Weather is iffy — keep this short (${halved} min) and have an indoor backup ready: ${backup.notes}`;
    return {
      ...item,
      duration: halved,
      notes: note,
    };
  });
}
