import type { DailyNeed } from "@/lib/nutrition-data";

export function formatDailyNeed(need: DailyNeed): string {
  return `${need.amount} ${need.unit}`;
}
