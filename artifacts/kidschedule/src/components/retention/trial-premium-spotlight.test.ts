import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

describe("TrialPremiumSpotlight Smart Math route", () => {
  it("points Smart Math at the live /smart-math-tricks route", () => {
    const file = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "trial-premium-spotlight.tsx",
    );
    const src = readFileSync(file, "utf8");
    expect(src).toContain('href: "/smart-math-tricks"');
    expect(src).not.toContain('href: "/learning-zone/smart-math-tricks"');
  });
});
