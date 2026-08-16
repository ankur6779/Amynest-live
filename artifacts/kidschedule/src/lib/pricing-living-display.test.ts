import { describe, expect, it } from "vitest";
import type { PlanCard } from "@/hooks/use-subscription";
import {
  buildPlanPricePresentation,
  formatCurrencyAmount,
} from "@/lib/plan-price";
import {
  formatStickyPriceSummary,
  planBadgeLabel,
  pricingLivingPriceDisplay,
} from "@/lib/pricing-plan-card-ui";
import { applyIndiaPricing, INR_PLAN_PRICES } from "@/lib/pricing-region";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  ASK_AMY_SOFT_CONTINUE,
  hardDayPremiumContinueCta,
} from "@/lib/hard-day-monetization";

function plan(
  id: PlanCard["id"],
  price: number,
  currency = "USD",
  extras: Partial<PlanCard> = {},
): PlanCard {
  return {
    id,
    title: id,
    price,
    currency,
    period: id === "yearly" ? "year" : id === "six_month" ? "6 months" : "month",
    badge: null,
    features: [],
    ...extras,
  };
}

describe("pricing living display — billed amount stays primary", () => {
  it("yearly monthly_primary: large line is billed amount, equivalent is secondary", () => {
    const source = plan("yearly", 39.99, "USD");
    const pres = buildPlanPricePresentation(source, { hierarchy: "monthly_primary" });
    const living = pricingLivingPriceDisplay(pres);
    expect(pres.numericAmount).toBe(39.99);
    expect(living.amountLine).toContain("39.99");
    expect(living.amountLine).not.toMatch(/\/month/);
    expect(living.equivalentLine).toMatch(/\/month/);
    expect(living.periodLine.toLowerCase()).toMatch(/annual|year/);
    expect(living.periodLine.toLowerCase()).not.toContain("39.99");
  });

  it("does not replace billed amount with monthly equivalent", () => {
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
      hierarchy: "monthly_primary",
    });
    const living = pricingLivingPriceDisplay(pres);
    expect(living.amountLine).not.toBe(pres.primaryLine);
    expect(pres.secondaryBillingLine).toContain(living.amountLine);
  });

  it("sticky summary uses billed amount, not monthly equivalent", () => {
    const yearly = plan("yearly", 39.99, "USD");
    const summary = formatStickyPriceSummary(yearly);
    const pres = buildPlanPricePresentation(yearly, { hierarchy: "monthly_primary" });
    expect(summary.priceLine).toContain("39.99");
    expect(summary.priceLine).not.toBe(pres.primaryLine);
    expect(summary.billingLine.toLowerCase()).toMatch(/annual|year|month/);
  });
});

describe("pricing living display — country amounts from existing product data", () => {
  it("India overlay yearly matches INR_PLAN_PRICES and engine formatting", () => {
    const overlaid = applyIndiaPricing([plan("yearly", 39.99, "USD")]);
    expect(overlaid[0].price).toBe(INR_PLAN_PRICES.yearly);
    expect(overlaid[0].currency).toBe("INR");
    expect(overlaid[0].formattedPrice).toBe(`₹${INR_PLAN_PRICES.yearly}`);

    const pres = buildPlanPricePresentation(overlaid[0], { hierarchy: "monthly_primary" });
    const living = pricingLivingPriceDisplay(pres);
    expect(pres.numericAmount).toBe(INR_PLAN_PRICES.yearly);
    expect(living.amountLine).toBe(
      formatCurrencyAmount(INR_PLAN_PRICES.yearly, "INR"),
    );
  });

  it("US fallback yearly uses existing API amount 39.99 USD", () => {
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
      hierarchy: "monthly_primary",
    });
    const living = pricingLivingPriceDisplay(pres);
    expect(pres.currency).toBe("USD");
    expect(pres.numericAmount).toBe(39.99);
    expect(living.amountLine).toContain("39.99");
  });

  it("UK store string is not converted; billed numeric stays store amount", () => {
    const store = { amount: 34.99, currency: "GBP", priceString: "£34.99" };
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
      hierarchy: "monthly_primary",
      store,
    });
    const living = pricingLivingPriceDisplay(pres);
    expect(pres.currency).toBe("GBP");
    expect(pres.numericAmount).toBe(34.99);
    expect(living.amountLine).toBe(formatCurrencyAmount(34.99, "GBP"));
    expect(pres.secondaryBillingLine).toContain(living.amountLine);
  });

  it("EUR store string is not converted; billed numeric stays store amount", () => {
    const store = { amount: 39.99, currency: "EUR", priceString: "39,99 €" };
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
      hierarchy: "monthly_primary",
      store,
    });
    const living = pricingLivingPriceDisplay(pres);
    expect(pres.currency).toBe("EUR");
    expect(pres.numericAmount).toBe(39.99);
    expect(living.amountLine).toBe(formatCurrencyAmount(39.99, "EUR"));
  });

  it("writes country verification log from existing product data", async () => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    const indiaYearly = applyIndiaPricing([plan("yearly", 39.99, "USD")])[0];
    const indiaSix = applyIndiaPricing([plan("six_month", 24.99, "USD")])[0];
    const indiaMonth = applyIndiaPricing([plan("monthly", 4.99, "USD")])[0];
    const rows = [
      {
        market: "India web overlay",
        source: "INR_PLAN_PRICES / applyIndiaPricing",
        yearly: pricingLivingPriceDisplay(
          buildPlanPricePresentation(indiaYearly, { hierarchy: "monthly_primary" }),
        ),
        billedAmount: indiaYearly.price,
        currency: indiaYearly.currency,
        formattedPrice: indiaYearly.formattedPrice,
      },
      {
        market: "US API fallback",
        source: "existing PLAN_PRICES.yearly 39.99 USD",
        yearly: pricingLivingPriceDisplay(
          buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
            hierarchy: "monthly_primary",
          }),
        ),
        billedAmount: 39.99,
        currency: "USD",
      },
      {
        market: "UK store passthrough",
        source: "store amount/currency/priceString unchanged",
        yearly: pricingLivingPriceDisplay(
          buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
            hierarchy: "monthly_primary",
            store: { amount: 34.99, currency: "GBP", priceString: "£34.99" },
          }),
        ),
        billedAmount: 34.99,
        currency: "GBP",
        note: "34.99 GBP is a store fixture to prove passthrough, not a newly invented catalog price",
      },
      {
        market: "EUR store passthrough",
        source: "store amount/currency/priceString unchanged",
        yearly: pricingLivingPriceDisplay(
          buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
            hierarchy: "monthly_primary",
            store: { amount: 39.99, currency: "EUR", priceString: "39,99 €" },
          }),
        ),
        billedAmount: 39.99,
        currency: "EUR",
        note: "39.99 EUR is a store fixture to prove passthrough, not a newly invented catalog price",
      },
    ];
    const extra = {
      indiaSixMonth: {
        price: indiaSix.price,
        formattedPrice: indiaSix.formattedPrice,
        living: pricingLivingPriceDisplay(
          buildPlanPricePresentation(indiaSix, { hierarchy: "monthly_primary" }),
        ),
      },
      indiaMonthly: {
        price: indiaMonth.price,
        formattedPrice: indiaMonth.formattedPrice,
        living: pricingLivingPriceDisplay(
          buildPlanPricePresentation(indiaMonth, { hierarchy: "monthly_primary" }),
        ),
      },
    };
    try {
      writeFileSync(
        "/opt/cursor/artifacts/country_price_verification.json",
        JSON.stringify({ rows, extra }, null, 2),
      );
    } catch {
      /* artifacts dir is environment-specific */
    }
    expect(indiaYearly.price).toBe(INR_PLAN_PRICES.yearly);
  });
});

describe("pricing living merchandising", () => {
  it("keeps existing badge copy without promotional icon prefixes", () => {
    expect(planBadgeLabel("yearly", "Smartest Choice")).toBe("Smartest Choice");
    expect(planBadgeLabel("six_month", "Most Popular")).toBe("Most Popular");
    expect(planBadgeLabel("monthly", null)).toBeNull();
  });

  it("P0-7 continue voice is unchanged", () => {
    expect(hardDayPremiumContinueCta()).toBe(PREMIUM_VOICE.continueCta);
    expect(ASK_AMY_SOFT_CONTINUE.notNowLabel).toBe("Not now");
  });
});
