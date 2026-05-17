import type { ExplanationResponse } from "@workspace/api-zod";
import type {
  HouseholdForecastResponse,
  HouseholdCaregiverLoadForecast,
  HouseholdBottleneckPrediction,
  HouseholdTimelineSlot,
} from "@workspace/api-zod";

export type DayPart = "morning" | "afternoon" | "evening";
export type LoadLevel = "light" | "moderate" | "heavy";

const DAY_PART_HOURS: Record<DayPart, [number, number]> = {
  morning: [6, 11],
  afternoon: [12, 16],
  evening: [17, 21],
};

export function normalizeActivityName(activity: string): string {
  return activity.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Drop repeated activities (e.g. duplicate Water Break, Wake up). */
export function dedupeActivityKey(activity: string, seen: Set<string>): boolean {
  const key = normalizeActivityName(activity);
  if (!key || seen.has(key)) return true;
  seen.add(key);
  return false;
}

export function parseTimeMinutes(t: string): number {
  const [timePart, period] = t.trim().split(/\s+/);
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period?.toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export function dayPartFromTime(time: string): DayPart {
  const h = Math.floor(parseTimeMinutes(time) / 60);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function loadLevelLabel(level: LoadLevel): string {
  if (level === "light") return "light";
  if (level === "moderate") return "moderate";
  return "heavy";
}

export function aggregateHourly(forecast: HouseholdCaregiverLoadForecast): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const { bucketMinutes, load } = forecast.series;
  const bucketsPerHour = Math.max(1, Math.round(60 / bucketMinutes));
  for (const cg of Object.keys(load)) {
    const arr = load[cg];
    const hours: number[] = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      let peak = 0;
      const start = h * bucketsPerHour;
      const end = Math.min(arr.length, start + bucketsPerHour);
      for (let b = start; b < end; b++) if (arr[b] > peak) peak = arr[b];
      hours[h] = peak;
    }
    out[cg] = hours;
  }
  return out;
}

function maxLoadInRange(perHour: number[], [from, to]: [number, number]): number {
  let max = 0;
  for (let h = from; h <= to; h++) max = Math.max(max, perHour[h] ?? 0);
  return max;
}

export function combinedHourlyLoad(hourlyByCaregiver: Record<string, number[]>): number[] {
  const combined = new Array(24).fill(0);
  for (const arr of Object.values(hourlyByCaregiver)) {
    for (let h = 0; h < 24; h++) combined[h] = Math.max(combined[h], arr[h] ?? 0);
  }
  return combined;
}

export function loadLevelFromPeak(peak: number, capacity = 1): LoadLevel {
  const ratio = capacity > 0 ? peak / capacity : 0;
  if (peak <= 0) return "light";
  if (ratio <= 0.55) return "light";
  if (ratio <= 1.05) return "moderate";
  return "heavy";
}

export function buildDayPartLoads(combinedHourly: number[], capacity = 1): Record<DayPart, LoadLevel> {
  return {
    morning: loadLevelFromPeak(maxLoadInRange(combinedHourly, DAY_PART_HOURS.morning), capacity),
    afternoon: loadLevelFromPeak(maxLoadInRange(combinedHourly, DAY_PART_HOURS.afternoon), capacity),
    evening: loadLevelFromPeak(maxLoadInRange(combinedHourly, DAY_PART_HOURS.evening), capacity),
  };
}

export function buildForecastSummary(
  bottlenecks: HouseholdBottleneckPrediction[],
  dayParts: Record<DayPart, LoadLevel>,
): { headline: string; suggestion: string } {
  const heavyAfternoon = dayParts.afternoon === "heavy";
  const heavyMorning = dayParts.morning === "heavy";
  const highBn = bottlenecks.some((b) => b.severity === "high");

  let headline = "Tomorrow looks manageable";
  if (heavyAfternoon || highBn) headline = "Tomorrow may feel busy";
  else if (heavyMorning) headline = "Tomorrow starts full — ease into the afternoon";

  let suggestion = "Keep your usual rhythm — no major changes needed.";
  if (heavyAfternoon) suggestion = "Plan breaks in the afternoon when energy dips.";
  else if (dayParts.evening === "heavy") suggestion = "Keep evenings calmer — wind down earlier if you can.";
  else if (bottlenecks.length > 0) {
    suggestion = bottlenecks[0].reason.split(".")[0] || suggestion;
  }

  return { headline, suggestion };
}

export function householdBalanceMessage(score: number): string {
  if (score >= 80) return "Your day is well balanced";
  if (score >= 60) return "Your day is mostly balanced — small tweaks may help";
  return "Today needs a little coordination";
}

export type SimplifiedTimelineBlock = {
  part: DayPart;
  label: string;
  activities: string[];
  hasConflict: boolean;
};

export function buildSimplifiedTimeline(slots: HouseholdTimelineSlot[]): SimplifiedTimelineBlock[] {
  const parts: Record<DayPart, { activities: string[]; hasConflict: boolean }> = {
    morning: { activities: [], hasConflict: false },
    afternoon: { activities: [], hasConflict: false },
    evening: { activities: [], hasConflict: false },
  };
  const seen = new Set<string>();

  for (const slot of slots) {
    const part = dayPartFromTime(slot.startTime);
    if (slot.hasConflict) parts[part].hasConflict = true;
    for (const e of slot.entries) {
      if (dedupeActivityKey(e.item.activity, seen)) continue;
      parts[part].activities.push(e.item.activity);
    }
  }

  const labels: Record<DayPart, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };

  return (["morning", "afternoon", "evening"] as const)
    .map((part) => ({
      part,
      label: labels[part],
      activities: parts[part].activities.slice(0, 8),
      hasConflict: parts[part].hasConflict,
    }))
    .filter((b) => b.activities.length > 0 || b.hasConflict);
}

export function parentActionFromExplanation(data: ExplanationResponse): string {
  const negative = data.factors.filter((f) => f.influence === "negative");
  if (negative[0]?.detail) {
    return negative[0].detail;
  }
  if (data.aiNarrative) {
    const first = data.aiNarrative.split(/[.!?]/)[0]?.trim();
    if (first) return first + ".";
  }
  const step = data.trace.steps[0];
  if (step?.detail) return step.detail;
  return "Follow the routine pace — Amy balanced meals, rest, and play for today.";
}

export function insightBulletsFromExplanation(data: ExplanationResponse): string[] {
  const fromFactors = data.factors.slice(0, 5).map((f) => {
    const detail = f.detail?.trim();
    if (detail) return detail.endsWith(".") ? detail : `${detail}.`;
    return `${f.label} influenced today's plan.`;
  });
  if (fromFactors.length > 0) return fromFactors;
  return data.trace.steps.slice(0, 4).map((s) => s.detail || s.title);
}

export function keyFactorLabels(data: ExplanationResponse): string[] {
  const labels = new Set<string>();
  for (const f of data.factors) {
    const l = f.label.toLowerCase();
    if (l.includes("mood")) labels.add("mood");
    else if (l.includes("weather") || l.includes("outdoor")) labels.add("weather");
    else if (l.includes("school")) labels.add("school");
    else if (l.includes("sleep")) labels.add("sleep");
    else labels.add(f.label);
  }
  if (labels.size === 0) return ["mood", "weather", "school schedule"];
  return [...labels].slice(0, 4);
}

export function firstForecastDayHourly(
  forecast: HouseholdForecastResponse | undefined,
): { date: string; hourly: Record<string, number[]> } | null {
  const f = forecast?.forecasts?.[0];
  if (!f) return null;
  return { date: f.date, hourly: aggregateHourly(f) };
}
