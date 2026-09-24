import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_USERS_FOR_QUALITY_SIGNAL,
  buildAdsConversionAlerts,
  recommendQualitySignal,
  type AdsHealthVolumeRow,
} from "./alerts.js";
import type { AdsHealthEventKey } from "./catalog.js";

function row(
  key: AdsHealthEventKey,
  patch: Partial<AdsHealthVolumeRow> = {},
): AdsHealthVolumeRow {
  return {
    key,
    events7d: 0,
    events30d: 0,
    users7d: 0,
    users30d: 0,
    eventsPrior7d: 0,
    lastSeen: null,
    duplicatePurchaseGroups: 0,
    ...patch,
  };
}

describe("ads conversion health alerts", () => {
  it("flags a stopped event when 30d volume exists and 7d is zero", () => {
    const alerts = buildAdsConversionAlerts([
      row("first_plan_generated", { events30d: 12, events7d: 0 }),
    ]);
    assert.ok(alerts.some((a) => a.id === "ads_event_stopped_first_plan_generated"));
  });

  it("flags a >30% drop only when the prior week had enough volume", () => {
    const noisy = buildAdsConversionAlerts([
      row("trial_started", { events7d: 1, eventsPrior7d: 2 }),
    ]);
    assert.equal(noisy.some((a) => a.id === "ads_event_drop_trial_started"), false);

    const real = buildAdsConversionAlerts([
      row("trial_started", { events7d: 4, eventsPrior7d: 12 }),
    ]);
    assert.ok(real.some((a) => a.id === "ads_event_drop_trial_started"));
  });

  it("flags duplicate purchases and broken purchase tracking", () => {
    const alerts = buildAdsConversionAlerts([
      row("purchase", {
        events7d: 0,
        events30d: 3,
        duplicatePurchaseGroups: 2,
      }),
      row("signup_completed", { events7d: 8, events30d: 20 }),
    ]);
    assert.ok(alerts.some((a) => a.id === "ads_duplicate_purchase"));
    assert.ok(alerts.some((a) => a.id === "ads_purchase_tracking_broken"));
  });

  it("does not pick a quality winner without enough users or purchases", () => {
    const low = recommendQualitySignal([
      row("first_plan_generated", { users30d: 4 }),
      row("trial_started", { users30d: 2 }),
      row("purchase", { users30d: 0 }),
    ]);
    assert.equal(low.enoughData, false);
    assert.equal(low.event, null);
    assert.match(low.reason, /Insufficient data/);
    assert.ok(MIN_USERS_FOR_QUALITY_SIGNAL >= 15);
  });
});
