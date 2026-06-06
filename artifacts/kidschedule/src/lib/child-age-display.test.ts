import { describe, expect, it } from "vitest";
import { formatChildAgeWithEstimate } from "./child-age-display";

const t = ((key: string, opts?: Record<string, string>) => {
  if (opts) return `${key}:${opts.years ?? ""}`;
  return key;
}) as import("i18next").TFunction;

describe("child-age-display", () => {
  it("shows estimated suffix when dob is approximate", () => {
    expect(formatChildAgeWithEstimate(4, 0, true, t)).toContain("age_years_estimated");
    expect(formatChildAgeWithEstimate(0, 6, true, t)).toBe("pages.children.index.age_under_1_estimated");
  });

  it("shows plain age when exact birthday was provided", () => {
    expect(formatChildAgeWithEstimate(4, 0, false, t)).toContain("age_reply_years");
  });
});
