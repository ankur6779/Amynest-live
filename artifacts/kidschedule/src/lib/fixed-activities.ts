import type { FixedActivity } from "@workspace/api-client-react";

export type FixedActivityDraft = FixedActivity;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const FIXED_ACTIVITY_TEMPLATES: Array<{
  key: string;
  label: string;
  emoji: string;
  activity: string;
  days: string[];
  start: string;
  end: string;
}> = [
  {
    key: "tuition",
    label: "Tuition",
    emoji: "📚",
    activity: "Math tuition",
    days: ["Mon", "Wed"],
    start: "17:00",
    end: "18:00",
  },
  {
    key: "sports",
    label: "Sports",
    emoji: "⚽",
    activity: "Football practice",
    days: ["Tue", "Thu"],
    start: "17:00",
    end: "18:30",
  },
  {
    key: "dance",
    label: "Dance",
    emoji: "💃",
    activity: "Dance class",
    days: ["Sat"],
    start: "10:00",
    end: "11:00",
  },
  {
    key: "music",
    label: "Music",
    emoji: "🎵",
    activity: "Music lesson",
    days: ["Fri"],
    start: "16:30",
    end: "17:30",
  },
];

export function emptyFixedActivity(): FixedActivityDraft {
  return { activity: "", days: [], start: "17:00", end: "18:00" };
}

export function normalizeFixedActivities(raw: unknown): FixedActivityDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      activity: String(e.activity ?? "").trim(),
      days: Array.isArray(e.days)
        ? e.days.filter((d): d is string => typeof d === "string")
        : [],
      start: String(e.start ?? "17:00"),
      end: String(e.end ?? "18:00"),
    }))
    .filter((e) => e.activity && e.days.length > 0 && e.start && e.end);
}

export function activitiesForDate(
  list: FixedActivityDraft[],
  date: string,
): FixedActivityDraft[] {
  const dow = new Date(date + "T12:00:00").getDay();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const label = labels[dow] ?? "Mon";
  return list.filter((a) =>
    a.days.some((d) => d.toLowerCase().startsWith(label.toLowerCase().slice(0, 3))),
  );
}

export function groupActivitiesByWeekday(
  list: FixedActivityDraft[],
): Record<(typeof WEEKDAY_LABELS)[number], FixedActivityDraft[]> {
  const grouped = Object.fromEntries(
    WEEKDAY_LABELS.map((d) => [d, [] as FixedActivityDraft[]]),
  ) as Record<(typeof WEEKDAY_LABELS)[number], FixedActivityDraft[]>;

  for (const activity of list) {
    for (const day of activity.days) {
      const key = WEEKDAY_LABELS.find((w) =>
        day.toLowerCase().startsWith(w.toLowerCase().slice(0, 3)),
      );
      if (key && !grouped[key].some((a) => a === activity)) {
        grouped[key].push(activity);
      }
    }
  }
  return grouped;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

function parseClockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function activityDurationMinutes(a: FixedActivityDraft): number {
  return Math.max(0, parseClockToMinutes(a.end) - parseClockToMinutes(a.start));
}

export type WeeklyScheduleInsight = {
  busyDays: string[];
  lightDays: string[];
  recommendation: string;
};

export function buildWeeklyScheduleInsight(
  activities: FixedActivityDraft[],
  childName?: string,
): WeeklyScheduleInsight | null {
  if (!activities.length) return null;

  const grouped = groupActivitiesByWeekday(activities);
  const busyDays: string[] = [];
  const lightDays: string[] = [];

  for (const day of WEEKDAY_LABELS) {
    const items = grouped[day];
    const totalMins = items.reduce((s, a) => s + activityDurationMinutes(a), 0);
    if (items.length >= 2 || totalMins >= 120) busyDays.push(day);
    if (items.length === 0) lightDays.push(day);
  }

  const who = childName?.trim() || "your child";
  let recommendation: string;
  if (busyDays.length >= 4) {
    recommendation = `${who} has a packed week — consider lighter days where possible for rest and free play.`;
  } else if (busyDays.length >= 2 && lightDays.length >= 2) {
    recommendation = `Good balance: busier on ${busyDays.slice(0, 3).join(", ")} with lighter days to recover.`;
  } else if (lightDays.length >= 5) {
    recommendation = `Most days are open — adding one regular activity can make routines more predictable.`;
  } else {
    recommendation = `This weekly rhythm looks manageable for ${who}.`;
  }

  return { busyDays, lightDays, recommendation };
}

/** Client-side summary when API message is absent. */
export function personalizeFixedSummary(
  childName: string | undefined,
  adjusted: boolean,
): string {
  const who = childName?.trim() || "your child";
  return adjusted
    ? `Adjusted around ${who}'s activities.`
    : `Built around ${who}'s activities.`;
}
