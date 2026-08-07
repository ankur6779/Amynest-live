import { describe, expect, it } from "vitest";
import {
  INFANT_CARE_QUIET_DESTINATIONS,
  recommendInfantCareAction,
} from "./living-room";

describe("Infant Care Phase 2 living room", () => {
  it("recommends cry comfort under 3 months", () => {
    const r = recommendInfantCareAction(2, 14);
    expect(r.sectionId).toBe("infant-cry");
    expect(r.label).toBe("Start here");
  });

  it("recommends sleep in evening for older infants", () => {
    const r = recommendInfantCareAction(5, 20);
    expect(r.sectionId).toBe("infant-sleep");
  });

  it("recommends feeding daytime at 6+ months", () => {
    const r = recommendInfantCareAction(8, 12);
    expect(r.sectionId).toBe("infant-feeding");
  });

  it("keeps quiet destination set stable for deep links", () => {
    expect(INFANT_CARE_QUIET_DESTINATIONS).toContain("infant-sleep");
    expect(INFANT_CARE_QUIET_DESTINATIONS).toContain("infant-health");
    expect(INFANT_CARE_QUIET_DESTINATIONS).toHaveLength(5);
  });
});
