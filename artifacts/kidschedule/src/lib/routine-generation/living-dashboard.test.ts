import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  livingDashboardBuildCta,
  livingDashboardContinueCta,
  livingDashboardEmptyBody,
  livingDashboardEmptyTitle,
  livingDashboardOpen,
  livingDashboardProductName,
  livingDashboardRebuildCta,
} from "./living-dashboard";

describe("routine living dashboard copy", () => {
  it("is today's plan — never an AI planner SKU", () => {
    const open = livingDashboardOpen("Maya");
    const blob = [
      livingDashboardProductName(),
      open.title,
      open.purpose,
      livingDashboardEmptyTitle(),
      livingDashboardEmptyBody("Maya"),
      livingDashboardBuildCta(),
      livingDashboardContinueCta(),
      livingDashboardRebuildCta(),
    ]
      .join(" ")
      .toLowerCase();
    expect(livingDashboardProductName().toLowerCase()).toBe("today's plan");
    expect(livingDashboardBuildCta()).toBe("Build today's plan");
    expect(livingDashboardRebuildCta()).toBe("Rebuild today's plan");
    expect(livingDashboardContinueCta()).toBe("Begin today");
    expect(blob).not.toMatch(
      /generate ai|generate schedule|unlock|explore free|try pro|marketplace|sparkle|saas/,
    );
  });

  it("empty state is companionship, not a database widget", () => {
    expect(livingDashboardEmptyTitle().toLowerCase()).toContain("no plan");
    expect(livingDashboardEmptyBody("Leo").toLowerCase()).toContain("leo");
    expect(livingDashboardEmptyBody("Leo").toLowerCase()).not.toMatch(/generate with ai|personalized schedule/);
  });

  it("wires /routines to the living dashboard instead of the purple tab shell", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../pages/routines/index.tsx"),
      "utf8",
    );
    expect(src).toContain("isRoutineLivingV1Enabled()");
    expect(src).toContain("<RoutineLivingDashboard");
    expect(src).toMatch(/if \(livingDashboard\)/);
  });
});
