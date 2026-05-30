import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  trackMarketingAssetViewed,
  trackReferralPromptClicked,
  trackReferralPromptViewed,
} from "@/lib/infant-marketing-analytics";

describe("infant-marketing-analytics", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      dataLayer: [],
    });
  });

  it("tracks marketing asset views", () => {
    expect(() =>
      trackMarketingAssetViewed("landing_infant_section", { page: "landing" }),
    ).not.toThrow();
  });

  it("tracks referral prompt funnel", () => {
    expect(() => trackReferralPromptViewed("weekly_share")).not.toThrow();
    expect(() =>
      trackReferralPromptClicked("milestone_share", "share_link"),
    ).not.toThrow();
  });
});
