import { describe, expect, it } from "vitest";
import { scrubBirthSkyAnalyticsProps } from "./analytics-scrub";

describe("scrubBirthSkyAnalyticsProps", () => {
  it("allows opaque safe props", () => {
    const result = scrubBirthSkyAnalyticsProps({
      referrer: "parenting_hub",
      has_profile: false,
      time_precision: "unknown",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.props.referrer).toBe("parenting_hub");
    }
  });

  it("rejects birth time / place / coords keys", () => {
    expect(scrubBirthSkyAnalyticsProps({ birthTime: "12:00" }).ok).toBe(false);
    expect(scrubBirthSkyAnalyticsProps({ latitude: 1.2 }).ok).toBe(false);
    expect(scrubBirthSkyAnalyticsProps({ birth_place: "City" }).ok).toBe(false);
  });

  it("rejects non-scalar values", () => {
    expect(scrubBirthSkyAnalyticsProps({ nested: { a: 1 } }).ok).toBe(false);
  });
});
