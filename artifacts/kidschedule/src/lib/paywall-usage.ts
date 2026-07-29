import type { PaywallReason } from "@/contexts/paywall-context";
import type { Entitlements } from "@/hooks/use-subscription";

export type PaywallUsageProgress = {
  used: number;
  limit: number;
  label: string;
};

/**
 * Derive quota progress for contextual paywalls from /api/subscription entitlements.
 * Returns null when the reason has no countable free quota.
 */
export function resolvePaywallUsageProgress(
  reason: PaywallReason,
  entitlements: Entitlements | null | undefined,
): PaywallUsageProgress | null {
  const features = entitlements?.usage?.features;
  if (!features) return null;

  const pick = (
    key: keyof NonNullable<Entitlements["usage"]["features"]>,
    label: string,
  ): PaywallUsageProgress | null => {
    const row = features[key];
    if (!row || typeof row.limit !== "number" || row.limit <= 0) return null;
    return {
      used: Math.min(row.used ?? 0, row.limit),
      limit: row.limit,
      label,
    };
  };

  switch (reason) {
    case "ai_quota":
      return pick("ai_query", "Amy AI questions today");
    case "infant_ai_quota":
      return pick("infant_ai_query", "Baby Expert questions today");
    case "routines_limit":
      return pick("routine_generate", "Personalized routines");
    case "speech_coach":
      return pick("hub_speech_session", "Speech practice sessions");
    case "hub_nutrition":
      return pick("nutrition_week_plan", "AI meal plans");
    case "nutrition_library":
      return pick("nutrition_pdf", "Nutrition library downloads");
    case "audio_lessons":
      return pick("audio_lesson", "Audio lessons today");
    case "behavior_locked":
      return pick("behavior_log", "Behavior logs");
    case "infant_sleep_coach":
      return pick("infant_sleep_coach", "Sleep coach plans");
    case "infant_feeding_plan":
      return pick("infant_feeding_plan", "Feeding plans");
    default:
      return null;
  }
}
