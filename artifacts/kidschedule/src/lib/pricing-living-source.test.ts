import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pricingPage = readFileSync(
  path.resolve(import.meta.dirname, "../pages/pricing.tsx"),
  "utf8",
);
const livingCss = readFileSync(
  path.resolve(import.meta.dirname, "../pages/pricing-living.css"),
  "utf8",
);

describe("Plans living remanufacture — source contracts", () => {
  it("keeps existing purchase, restore, and India overlay paths", () => {
    expect(pricingPage).toContain("checkoutRazorpay");
    expect(pricingPage).toContain("nativeBilling.purchase");
    expect(pricingPage).toContain("nativeBilling.restore");
    expect(pricingPage).toContain("applyIndiaPricing");
    expect(pricingPage).toContain("finalizeNativePurchase");
    expect(pricingPage).toContain('data-testid={`plan-card-${p.id}`}');
    expect(pricingPage).toContain('data-testid="button-upgrade-app-store"');
    expect(pricingPage).toContain('data-testid="button-upgrade-googlepay"');
    expect(pricingPage).toContain('data-testid="button-upgrade-razorpay"');
    expect(pricingPage).toContain("pricing.restore_purchases");
  });

  it("does not hardcode replacement prices or FOMO theatre", () => {
    expect(pricingPage).not.toMatch(/LIMITED TIME|ACT NOW|ONLY TODAY|YOU'LL MISS OUT/i);
    expect(pricingPage).not.toContain("Unlock Everything");
    expect(pricingPage).not.toContain("patent_pending");
    expect(pricingPage).not.toContain("SUBSCRIPTION_HERO");
    expect(pricingPage).not.toContain("#ff4ecd");
    expect(pricingPage).not.toContain("#7b3ff2");
    expect(livingCss).not.toContain("#ff4ecd");
    expect(livingCss).not.toContain("#7b3ff2");
  });

  it("keeps billed amount as the visual primary on plan cards", () => {
    expect(pricingPage).toContain("preferBilledPrimary");
    expect(pricingPage).toContain("Keep Amy beside you.");
    expect(pricingPage).toContain("PREMIUM_VOICE");
    expect(livingCss).toContain("pricing-living-stage");
    expect(livingCss).toContain("is-recommended");
    expect(livingCss).not.toMatch(/LIMITED TIME|countdown|scarcity/i);
  });
});
