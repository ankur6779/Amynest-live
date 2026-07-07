import type { LifecycleStage, OutcomeSignals } from "../outcomes/types.js";
import type { ParentValueScore } from "../value/parent-value-score.js";
import type { PersonaProfile } from "../persona/persona-engine.js";
import { isMonetizationStage } from "../lifecycle/lifecycle-stage.js";

export type ConversionOffer = "trial_7d" | "yearly_discount" | "monthly" | "renewal" | "none";

export interface ConversionReadiness {
  /** Whether to promote premium at all right now. */
  promote: boolean;
  /** 0–1 readiness — expected propensity to convert. */
  readiness: number;
  recommendedOffer: ConversionOffer;
  /** Which lifecycle stage the recommendation is anchored to. */
  anchorStage: LifecycleStage;
  /** Preferred deep link for the offer. */
  deepLink: string;
  reason: string;
}

/**
 * Decide, adaptively, whether and how to promote premium — replacing static
 * journeys with an expected-value view that blends lifecycle, realized value,
 * persona receptivity, and churn risk. Never promotes to premium users and
 * never promotes when readiness is low (no aggressive selling).
 */
export function assessConversionReadiness(
  stage: LifecycleStage,
  s: OutcomeSignals,
  value: ParentValueScore,
  persona: PersonaProfile,
): ConversionReadiness {
  const notReady = (reason: string): ConversionReadiness => ({
    promote: false,
    readiness: 0,
    recommendedOffer: "none",
    anchorStage: stage,
    deepLink: "/pricing",
    reason,
  });

  if (s.isPremium && stage !== "SUBSCRIPTION_EXPIRING") return notReady("already_premium");
  if (!isMonetizationStage(stage)) return notReady("stage_not_monetization");

  // Readiness model: realized value is the strongest driver — a parent who has
  // seen value converts; one who hasn't should get value first, not a pitch.
  let readiness = 0.15;
  readiness += (value.score / 100) * 0.45;
  if (persona.conversionReceptive) readiness += 0.1;
  readiness += Math.min(0.15, s.currentStreakDays / 7 * 0.15);

  // Stage-specific adjustments.
  switch (stage) {
    case "HIGH_PURCHASE_INTENT": readiness += 0.25; break;
    case "TRIAL_ENDING": readiness += 0.2; break;
    case "SUBSCRIPTION_EXPIRING": readiness += 0.2; break;
    case "POWER_USER": readiness += 0.1; break;
    default: break;
  }

  // Churn risk suppresses selling — help them stay, don't push a purchase.
  if (s.churnRisk30d > 0.7) readiness -= 0.3;

  readiness = round2(clamp01(readiness));

  const offer = recommendOffer(stage, persona, value);
  const promote = readiness >= 0.4 && offer !== "none";

  return {
    promote,
    readiness,
    recommendedOffer: offer,
    anchorStage: stage,
    deepLink: offerDeepLink(offer, stage),
    reason: promote ? "positive_expected_value" : "readiness_below_bar",
  };
}

function recommendOffer(
  stage: LifecycleStage,
  persona: PersonaProfile,
  value: ParentValueScore,
): ConversionOffer {
  if (stage === "SUBSCRIPTION_EXPIRING") return "renewal";
  if (stage === "TRIAL_ENDING") {
    // High realized value → confident yearly; otherwise softer monthly.
    return value.band === "high" ? "yearly_discount" : "monthly";
  }
  if (stage === "HIGH_PURCHASE_INTENT") return "trial_7d";
  if (persona.primary === "PREMIUM_POWER_USER" || value.band === "high") return "yearly_discount";
  return "trial_7d";
}

function offerDeepLink(offer: ConversionOffer, stage: LifecycleStage): string {
  const src = `notif_${stage.toLowerCase()}`;
  switch (offer) {
    case "yearly_discount": return `/pricing?plan=yearly&source=${src}`;
    case "monthly": return `/pricing?plan=monthly&source=${src}`;
    case "trial_7d": return `/pricing?trial=1&source=${src}`;
    case "renewal": return `/pricing?renew=1&source=${src}`;
    case "none": return "/pricing";
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
