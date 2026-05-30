/** Routine page UX helpers — display only, no generation logic. */

export type RoutinePreviewItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
};

export function formatRoutineDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatRelativeGeneratedAt(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(0, Math.floor((now - then) / 60_000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

/** Short activity labels for preview chips (e.g. "Morning • School • Play"). */
export function formatActivityPreviewChips(
  items: RoutinePreviewItem[],
  max = 5,
): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of items) {
    const label = categoryToPreviewLabel(item.category, item.activity);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= max) break;
  }
  return labels.join(" • ");
}

function categoryToPreviewLabel(category: string, activity: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("sleep") || activity.toLowerCase().includes("sleep")) return "Sleep";
  if (c.includes("school") || activity.toLowerCase().includes("school")) return "School";
  if (c.includes("meal") || c.includes("food") || activity.toLowerCase().includes("lunch")) return "Meals";
  if (c.includes("play") || c.includes("outdoor")) return "Play";
  if (c.includes("study") || c.includes("learn")) return "Study";
  if (c.includes("morning") || activity.toLowerCase().includes("wake")) return "Morning";
  const short = activity.trim().split(/\s+/).slice(0, 2).join(" ");
  return short.length > 18 ? short.slice(0, 16) + "…" : short || "Activity";
}

/** First N items for timeline preview list. */
export function pickPreviewTimeline(
  items: RoutinePreviewItem[],
  max = 5,
): { time: string; label: string }[] {
  return items.slice(0, max).map((i) => ({
    time: i.time,
    label: i.activity.length > 32 ? `${i.activity.slice(0, 30)}…` : i.activity,
  }));
}
