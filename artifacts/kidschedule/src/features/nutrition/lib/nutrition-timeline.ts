import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { aggregateMealStats } from "@/features/nutrition/lib/nutrition-memory";

export type TimelineEventKind = "streak" | "confidence" | "meal";

export interface NutritionTimelineEvent {
  id: string;
  kind: TimelineEventKind;
  dateKey: string;
  label: string;
  emoji: string;
}

export function buildNutritionTimeline(input: {
  todayKey: string;
  streak: number;
  confidenceLevel: string;
  memoryEntries: MealMemoryEntry[];
  ref?: Date;
}): NutritionTimelineEvent[] {
  const events: NutritionTimelineEvent[] = [];
  const ref = input.ref ?? new Date();
  const month = ref.getMonth();
  const year = ref.getFullYear();

  if (input.streak >= 3) {
    events.push({
      id: `streak-${input.streak}`,
      kind: "streak",
      dateKey: input.todayKey,
      label: `${input.streak}-day nourishment streak`,
      emoji: "🔥",
    });
  }

  if (input.confidenceLevel === "strong") {
    events.push({
      id: "confidence-strong",
      kind: "confidence",
      dateKey: input.todayKey,
      label: "Strong nourishment confidence this month",
      emoji: "🌟",
    });
  } else if (input.confidenceLevel === "steady") {
    events.push({
      id: "confidence-steady",
      kind: "confidence",
      dateKey: input.todayKey,
      label: "Steady nourishment rhythm",
      emoji: "🌱",
    });
  }

  const stats = aggregateMealStats(
    input.memoryEntries.filter((e) => {
      const [y, m] = e.dateKey.split("-").map(Number);
      return y === year && m! - 1 === month;
    }),
  );

  for (const s of stats) {
    if (s.loved >= 5) {
      events.push({
        id: `meal-${s.mealKey}`,
        kind: "meal",
        dateKey: input.todayKey,
        label: `Accepted ${shortLabel(s.mealName)} ${s.loved} times`,
        emoji: "🍽️",
      });
    }
  }

  return events.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function shortLabel(name: string): string {
  const p = name.split(/[+/,]/)[0]?.trim() ?? name;
  return p.length > 28 ? `${p.slice(0, 25)}…` : p;
}
