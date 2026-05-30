import { describe, expect, it } from "vitest";
import {
  getInfantAnalyticsAgeBand,
  consumeInfantHubEntrySource,
  setInfantHubEntrySource,
} from "@/lib/infant-hub-analytics";

describe("infant-hub-analytics", () => {
  it("maps age months to product analytics bands", () => {
    expect(getInfantAnalyticsAgeBand(0)).toBe("0-3");
    expect(getInfantAnalyticsAgeBand(3)).toBe("0-3");
    expect(getInfantAnalyticsAgeBand(4)).toBe("4-6");
    expect(getInfantAnalyticsAgeBand(7)).toBe("7-12");
    expect(getInfantAnalyticsAgeBand(13)).toBe("13-24");
    expect(getInfantAnalyticsAgeBand(24)).toBe("13-24");
  });

  it("consumes entry source from session storage once", () => {
    setInfantHubEntrySource("dashboard");
    expect(consumeInfantHubEntrySource()).toBe("dashboard");
    expect(consumeInfantHubEntrySource()).toBe("parenting_hub");
  });
});
