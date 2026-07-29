import type { PaywallReason } from "@/contexts/paywall-context";

export type NextUnlockItem = {
  id: string;
  label: string;
  emoji: string;
};

const CATALOG: NextUnlockItem[] = [
  { id: "ai", label: "Unlimited AI", emoji: "✨" },
  { id: "reports", label: "Weekly Reports", emoji: "📊" },
  { id: "health", label: "Health Lab", emoji: "💚" },
  { id: "learning", label: "Learning", emoji: "📚" },
  { id: "speech", label: "Speech", emoji: "🗣️" },
  { id: "nutrition", label: "Nutrition", emoji: "🥗" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "downloads", label: "Downloads", emoji: "📄" },
  { id: "birth_sky", label: "Birth Sky Stories", emoji: "🌌" },
];

/** Prioritize unlocks related to the current paywall reason, then fill with the rest. */
export function resolveNextUnlocks(
  reason: PaywallReason,
  module?: string | null,
): NextUnlockItem[] {
  const priorityIds: string[] = [];
  if (module === "birth_sky" || reason === "premium_insight") {
    priorityIds.push("birth_sky", "reports", "ai");
  }
  switch (reason) {
    case "ai_quota":
    case "infant_ai_quota":
      priorityIds.push("ai", "reports", "learning");
      break;
    case "routines_limit":
      priorityIds.push("ai", "reports", "health");
      break;
    case "speech_coach":
      priorityIds.push("speech", "learning", "ai");
      break;
    case "hub_nutrition":
    case "nutrition_library":
      priorityIds.push("nutrition", "health", "reports");
      break;
    case "learning_locked":
    case "hub_journey":
    case "phonics_workbook":
      priorityIds.push("learning", "speech", "games");
      break;
    case "infant_sleep_coach":
    case "infant_feeding_plan":
      priorityIds.push("health", "ai", "reports");
      break;
    default:
      priorityIds.push("ai", "learning", "health", "reports");
  }

  const seen = new Set<string>();
  const ordered: NextUnlockItem[] = [];
  for (const id of priorityIds) {
    const item = CATALOG.find((c) => c.id === id);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      ordered.push(item);
    }
  }
  for (const item of CATALOG) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      ordered.push(item);
    }
  }
  return ordered.slice(0, 6);
}
