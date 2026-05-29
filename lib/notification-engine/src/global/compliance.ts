import type { CulturalRegion, SupportedLocale } from "./locales.js";

export type ComplianceRegime = "gdpr" | "uk_gdpr" | "coppa" | "au_privacy" | "pipeda" | "default";

export function complianceRegimeForCountry(countryCode: string | null | undefined): ComplianceRegime {
  const cc = (countryCode ?? "").toUpperCase();
  if (cc === "US") return "coppa";
  if (cc === "GB") return "uk_gdpr";
  if (cc === "CA") return "pipeda";
  if (cc === "AU") return "au_privacy";
  if (["DE", "FR", "ES", "IT", "NL", "BE", "AT", "IE", "PL", "SE", "PT", "FI"].includes(cc)) {
    return "gdpr";
  }
  return "default";
}

export interface NotificationConsentState {
  pushConsentAt: Date | null;
  pushConsentVersion: string | null;
  marketingOptIn: boolean;
  countryCode: string | null;
  childAgeYears: number | null;
}

export function requiresExplicitPushConsent(regime: ComplianceRegime): boolean {
  return regime === "gdpr" || regime === "uk_gdpr" || regime === "pipeda" || regime === "au_privacy";
}

export function canDeliverPush(input: NotificationConsentState): { allowed: boolean; reason?: string } {
  const regime = complianceRegimeForCountry(input.countryCode);

  if (requiresExplicitPushConsent(regime)) {
    if (!input.pushConsentAt) {
      return { allowed: false, reason: "missing_push_consent" };
    }
  }

  if (regime === "coppa" && input.childAgeYears != null && input.childAgeYears < 13) {
    if (!input.pushConsentAt) {
      return { allowed: false, reason: "coppa_parental_consent" };
    }
  }

  return { allowed: true };
}

export const CURRENT_CONSENT_VERSION = "2026-05-global-v1";

export const REGIONAL_ENGAGEMENT_PRIORS: Record<CulturalRegion, { morning: number; evening: number }> = {
  south_asia: { morning: 0.55, evening: 0.75 },
  north_america: { morning: 0.45, evening: 0.65 },
  europe: { morning: 0.5, evening: 0.6 },
  latin_america: { morning: 0.5, evening: 0.7 },
  middle_east: { morning: 0.6, evening: 0.8 },
  east_asia: { morning: 0.65, evening: 0.55 },
  southeast_asia: { morning: 0.55, evening: 0.65 },
  oceania: { morning: 0.5, evening: 0.6 },
  africa: { morning: 0.55, evening: 0.7 },
};

/** Infer preferred delivery hour from open history (0–23). */
export function inferPreferredEngagementHour(
  openHours: number[],
  region: CulturalRegion,
): number | null {
  if (openHours.length >= 3) {
    const counts = new Map<number, number>();
    for (const h of openHours) {
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    let best = 19;
    let bestN = 0;
    for (const [h, n] of counts) {
      if (n > bestN) {
        bestN = n;
        best = h;
      }
    }
    return best;
  }
  const prior = REGIONAL_ENGAGEMENT_PRIORS[region];
  return prior.evening >= prior.morning ? 19 : 9;
}
