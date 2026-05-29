import { describe, expect, it } from "vitest";
import {
  buildPlanPricePresentation,
  formatCurrencyAmount,
  getMonthlyEquivalent,
  roundMonthlyEquivalent,
} from "@/lib/plan-price";
import type { PlanCard } from "@/hooks/use-subscription";

function plan(
  id: PlanCard["id"],
  price: number,
  currency = "USD",
  savingsPercent?: number,
): PlanCard {
  return {
    id,
    title: id,
    price,
    currency,
    period: id === "yearly" ? "year" : id === "six_month" ? "6 months" : "month",
    badge: null,
    features: [],
    savingsPercent,
  };
}

describe("buildPlanPricePresentation monthly_primary", () => {
  it("annual: primary is monthly equivalent, secondary is full annual charge", () => {
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD", 33), {
      hierarchy: "monthly_primary",
    });
    expect(pres.primaryLine).toMatch(/\/month$/);
    expect(pres.primaryLine).not.toContain("≈");
    expect(pres.secondaryBillingLine).toContain("Billed annually at");
    expect(pres.secondaryBillingLine).toContain("39.99");
    expect(pres.hierarchy).toBe("monthly_primary");
    const monthly = getMonthlyEquivalent("yearly", 39.99)!;
    expect(pres.primaryLine).toContain(
      formatCurrencyAmount(roundMonthlyEquivalent(monthly, "USD"), "USD"),
    );
  });

  it("six_month: primary monthly, secondary six-month total", () => {
    const pres = buildPlanPricePresentation(plan("six_month", 24.99, "USD", 17), {
      hierarchy: "monthly_primary",
    });
    expect(pres.primaryLine).toMatch(/\/month$/);
    expect(pres.secondaryBillingLine).toContain("Billed every 6 months at");
    expect(pres.secondaryBillingLine).toContain("24.99");
  });

  it("monthly: primary /month only, no equivalent line", () => {
    const pres = buildPlanPricePresentation(plan("monthly", 4.99, "USD"), {
      hierarchy: "monthly_primary",
    });
    expect(pres.primaryLine).toMatch(/\/month$/);
    expect(pres.secondaryBillingLine).toBe("Billed monthly");
    expect(pres.monthlyEquivalentLine).toBeNull();
  });

  it("INR uses localized formatting without hardcoded amounts", () => {
    const pres = buildPlanPricePresentation(plan("yearly", 1499, "INR"), {
      hierarchy: "monthly_primary",
    });
    expect(pres.primaryLine).toContain("₹");
    expect(pres.secondaryBillingLine).toContain("1,499");
  });

  it("uses store numeric price when provided", () => {
    const pres = buildPlanPricePresentation(plan("yearly", 39.99, "USD"), {
      hierarchy: "monthly_primary",
      store: { amount: 34.99, currency: "GBP", priceString: "£34.99" },
    });
    expect(pres.currency).toBe("GBP");
    expect(pres.secondaryBillingLine).toContain("34.99");
  });
});

describe("getMonthlyEquivalent", () => {
  it("yearly divides by 12", () => {
    expect(getMonthlyEquivalent("yearly", 39.99)).toBeCloseTo(39.99 / 12, 4);
  });
  it("six_month divides by 6", () => {
    expect(getMonthlyEquivalent("six_month", 24.99)).toBeCloseTo(24.99 / 6, 4);
  });
  it("monthly returns null", () => {
    expect(getMonthlyEquivalent("monthly", 4.99)).toBeNull();
  });
});
