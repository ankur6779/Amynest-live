import { describe, expect, it } from "vitest";
import { buildCanonicalUrl } from "./canonical-seo";
import { getFeaturePage, listFeaturePageSlugs } from "./feature-pages";
import { getGuideArticle, listGuideSlugs } from "./guides-content";
import { listFeedingPlanSlugs, listRoutineByAgeSlugs } from "./programmatic-pages";
import { listAllSeoRoutes, listPrerenderPaths } from "./seo-routes";

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
  it("lists twenty-nine parenting guides", () => {
    expect(listGuideSlugs().length).toBe(29);
  });

  it("links guides to feature pages when configured", () => {
    const guide = getGuideArticle("baby-sleep-schedule-by-age");
    expect(guide?.relatedFeatureSlug).toBe("infant-care");
  });

  it("includes expanded SEO guides with FAQs", () => {
    const guide = getGuideArticle("four-month-sleep-regression-guide");
    expect(guide?.faqs?.length).toBeGreaterThan(0);
    expect(guide?.authorId).toBe("amynest-editorial");
  });
});

describe("programmatic-pages", () => {
  it("lists routine-by-age slugs 1-12", () => {
    expect(listRoutineByAgeSlugs()).toHaveLength(12);
  });

  it("lists feeding plan slugs", () => {
    expect(listFeedingPlanSlugs()).toEqual(["6-months", "8-months", "10-months", "12-months"]);
  });
});

describe("seo-routes", () => {
  it("includes all public marketing routes", () => {
    const paths = listAllSeoRoutes().map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/get-app");
    expect(paths).toContain("/routine-by-age/3");
    expect(paths).toContain("/feeding-plan/6-months");
  });

  it("prerender list covers guides and features", () => {
    const prerender = listPrerenderPaths();
    expect(prerender.filter((p) => p.startsWith("/guides/")).length).toBe(29);
    expect(prerender.filter((p) => p.startsWith("/features/")).length).toBe(5);
  });
});
