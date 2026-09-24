import type { GrowthAlert } from "../../growth-dashboard/types.js";
import type { AdsHealthEventKey } from "./catalog.js";

export const MIN_USERS_FOR_DROP_ALERT = 10;
export const MIN_USERS_FOR_QUALITY_SIGNAL = 15;
export const VOLUME_DROP_PCT = 30;

export type AdsHealthVolumeRow = {
  key: AdsHealthEventKey;
  events7d: number;
  events30d: number;
  users7d: number;
  users30d: number;
  eventsPrior7d: number;
  lastSeen: string | null;
  duplicatePurchaseGroups: number;
};

export function buildAdsConversionAlerts(rows: AdsHealthVolumeRow[]): GrowthAlert[] {
  const alerts: GrowthAlert[] = [];
  const byKey = new Map(rows.map((r) => [r.key, r]));

  for (const row of rows) {
    if (row.events30d >= 5 && row.events7d === 0 && row.key !== "play_install") {
      alerts.push({
        id: `ads_event_stopped_${row.key}`,
        category: "warning",
        title: `${row.key} stopped firing`,
        message: `${row.key} had ${row.events30d} events in 30d and 0 in the last 7d.`,
      });
    }

    if (
      row.eventsPrior7d >= MIN_USERS_FOR_DROP_ALERT &&
      row.events7d < row.eventsPrior7d * (1 - VOLUME_DROP_PCT / 100)
    ) {
      const dropPct = Math.round(((row.eventsPrior7d - row.events7d) / row.eventsPrior7d) * 100);
      alerts.push({
        id: `ads_event_drop_${row.key}`,
        category: dropPct >= 50 ? "critical" : "warning",
        title: `${row.key} volume dropped ${dropPct}%`,
        message: `${row.key} events ${row.eventsPrior7d} → ${row.events7d} vs the prior 7 days.`,
      });
    }
  }

  const purchase = byKey.get("purchase");
  const signup = byKey.get("signup_completed") ?? byKey.get("sign_up");
  const routine = byKey.get("routine_generated") ?? byKey.get("first_plan_generated");
  if (
    purchase &&
    purchase.events30d > 0 &&
    purchase.events7d === 0 &&
    ((signup?.events7d ?? 0) > 0 || (routine?.events7d ?? 0) > 0)
  ) {
    alerts.push({
      id: "ads_purchase_tracking_broken",
      category: "critical",
      title: "Purchase tracking broken",
      message:
        "Postgres still records activation events in the last 7 days, but purchase events dropped to 0 after previously firing in the last 30 days.",
    });
  }

  if (purchase && purchase.duplicatePurchaseGroups > 0) {
    alerts.push({
      id: "ads_duplicate_purchase",
      category: "critical",
      title: "Duplicate purchase events detected",
      message: `${purchase.duplicatePurchaseGroups} user+transaction_id groups fired upgrade_completed more than once in 7 days.`,
    });
  }

  const importedQualityMissing = [
    byKey.get("first_plan_generated"),
    byKey.get("trial_started"),
    byKey.get("onboarding_completed"),
    byKey.get("sign_up"),
  ].filter((row): row is AdsHealthVolumeRow => !!row && row.users30d >= MIN_USERS_FOR_QUALITY_SIGNAL);

  if (importedQualityMissing.length > 0) {
    alerts.push({
      id: "ads_quality_not_imported",
      category: "info",
      title: "Quality events are not imported into Google Ads",
      message: `${importedQualityMissing.map((r) => r.key).join(", ")} have Postgres volume but no Ads conversion action. Import as Secondary only after reviewing the health table.`,
    });
  }

  return alerts;
}

export function recommendQualitySignal(rows: AdsHealthVolumeRow[]): {
  event: AdsHealthEventKey | null;
  reason: string;
  enoughData: boolean;
} {
  const firstPlan = rows.find((r) => r.key === "first_plan_generated");
  const trial = rows.find((r) => r.key === "trial_started");
  const purchase = rows.find((r) => r.key === "purchase");
  const purchaseUsers = purchase?.users30d ?? 0;

  if ((firstPlan?.users30d ?? 0) < MIN_USERS_FOR_QUALITY_SIGNAL && (trial?.users30d ?? 0) < MIN_USERS_FOR_QUALITY_SIGNAL) {
    return {
      event: null,
      reason:
        "Insufficient data — continue install optimization until enough quality-event volume exists.",
      enoughData: false,
    };
  }

  if (purchaseUsers < 5) {
    return {
      event: null,
      reason:
        "Insufficient data — continue install optimization until enough quality-event volume exists.",
      enoughData: false,
    };
  }

  if ((firstPlan?.users30d ?? 0) >= MIN_USERS_FOR_QUALITY_SIGNAL) {
    return {
      event: "first_plan_generated",
      reason: "First meaningful product value with enough unique users to consider as a Secondary import.",
      enoughData: true,
    };
  }

  return {
    event: "trial_started",
    reason: "Trial is later and higher intent, but only if first_plan_generated stays below the volume bar.",
    enoughData: true,
  };
}
