import { describe, expect, it } from "vitest";
import { childPlanCta, childPlanHeadline, PRODUCT_JOB_CORE } from "./product-promise";

describe("product promise", () => {
  it("names the child's plan without copying one slogan everywhere", () => {
    expect(PRODUCT_JOB_CORE.toLowerCase()).toContain("plan for today");
    expect(childPlanHeadline("Noah")).toBe("Noah's plan for today");
    expect(childPlanHeadline("")).toBe("Your child's plan for today");
    expect(childPlanCta("Noah")).toBe("See Noah's plan for today");
    expect(childPlanCta(null)).toBe("See today's plan");
  });
});
