import { describe, expect, it } from "vitest";
import { CANONICAL_FUNNEL_EVENTS } from "@workspace/analytics-taxonomy";
import { FUNNEL_LEGACY_ALIASES } from "./conversion-funnel";

describe("canonical conversion funnel", () => {
  it("has one name per required funnel step", () => {
    expect(CANONICAL_FUNNEL_EVENTS).toEqual([
      "first_open",
      "onboarding_started",
      "child_created",
      "onboarding_completed",
      "first_plan_generated",
      "first_value_achieved",
      "first_plan_action_started",
      "first_plan_action_completed",
      "paywall_view",
      "paywall_dismiss",
      "subscribe_clicked",
      "checkout_started",
      "purchase_success",
      "purchase_failed",
      "subscription_active",
      "restore_purchase",
    ]);
  });

  it("maps existing paywall and purchase events instead of inventing a second system", () => {
    expect(FUNNEL_LEGACY_ALIASES.paywall_view).toContain("premium_paywall_viewed");
    expect(FUNNEL_LEGACY_ALIASES.purchase_success).toContain("upgrade_completed");
    expect(FUNNEL_LEGACY_ALIASES.first_open).toContain("first_open");
  });
});
