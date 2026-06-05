import { describe, expect, it } from "vitest";
import { buildCanonicalUrl } from "./canonical-seo";
import { getFeaturePage, listFeaturePageSlugs } from "./feature-pages";
import { getGuideArticle, listGuideSlugs } from "./guides-content";

describe("buildCanonicalUrl", () => {
  it("uses www.amynest.in as canonical origin", () => {
    expect(buildCanonicalUrl("/guides")).toBe("https://www.amynest.in/guides");
    expect(buildCanonicalUrl("features/infant-care")).toBe("https://www.amynest.in/features/infant-care");
  });
});

describe("feature-pages", () => {
  it("lists five public SEO feature slugs", () => {
    expect(listFeaturePageSlugs()).toEqual([
      "infant-care",
      "speech-coach",
      "daily-routines",
      "study-zone",
      "nutrition-hub",
    ]);
  });

  it("returns config for known slug", () => {
    expect(getFeaturePage("speech-coach")?.headlineAccent).toBe("Amy Speech Coach");
    expect(getFeaturePage("unknown")).toBeUndefined();
  });
});

describe("guides-content", () => {
  it("lists seven parenting guides", () => {
    expect(listGuideSlugs().length).toBe(7);
  });

  it("links guides to feature pages when configured", () => {
    const guide = getGuideArticle("baby-sleep-schedule-by-age");
    expect(guide?.relatedFeatureSlug).toBe("infant-care");
  });
});
