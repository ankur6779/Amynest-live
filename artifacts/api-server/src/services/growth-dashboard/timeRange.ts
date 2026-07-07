import type { GrowthTimePreset, GrowthTimeRange } from "./types.js";

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

const PRESET_LABELS: Record<Exclude<GrowthTimePreset, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 Days",
  last_30_days: "Last 30 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
};

export function parseGrowthTimeRange(input: {
  preset?: string;
  start?: string;
  end?: string;
}): GrowthTimeRange {
  const now = new Date();
  const today = startOfDay(now);
  const preset = (input.preset ?? "last_7_days") as GrowthTimePreset;

  let start: Date;
  let end: Date;
  let label: string;

  switch (preset) {
    case "today":
      start = today;
      end = endOfDay(now);
      label = PRESET_LABELS.today;
      break;
    case "yesterday": {
      const y = addDays(today, -1);
      start = y;
      end = endOfDay(y);
      label = PRESET_LABELS.yesterday;
      break;
    }
    case "last_30_days":
      start = addDays(today, -29);
      end = endOfDay(now);
      label = PRESET_LABELS.last_30_days;
      break;
    case "this_month":
      start = startOfMonth(now);
      end = endOfDay(now);
      label = PRESET_LABELS.this_month;
      break;
    case "last_month": {
      const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      start = startOfMonth(prev);
      end = endOfMonth(prev);
      label = PRESET_LABELS.last_month;
      break;
    }
    case "this_year":
      start = startOfYear(now);
      end = endOfDay(now);
      label = PRESET_LABELS.this_year;
      break;
    case "custom": {
      const parsedStart = input.start ? new Date(input.start) : addDays(today, -6);
      const parsedEnd = input.end ? new Date(input.end) : endOfDay(now);
      start = startOfDay(parsedStart);
      end = endOfDay(parsedEnd);
      label = `${start.toISOString().slice(0, 10)} – ${end.toISOString().slice(0, 10)}`;
      break;
    }
    case "last_7_days":
    default:
      start = addDays(today, -6);
      end = endOfDay(now);
      label = PRESET_LABELS.last_7_days;
      break;
  }

  const durationMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs + 1);

  return {
    preset: preset === "custom" || Object.hasOwn(PRESET_LABELS, preset) ? preset : "last_7_days",
    start,
    end,
    previousStart,
    previousEnd,
    label,
  };
}
