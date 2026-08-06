import { describe, expect, it } from "vitest";
import { isV2SurfacePath } from "./V2CalmLoadingShell";
import {
  V2_CARD,
  V2_CARD_PANEL,
  V2_CARD_SOFT,
  V2_CTA,
  V2_MOTION_MS,
  V2_PRESS_PRIMARY,
  V2_SHEET,
  V2_SHELL,
} from "@/v2/craft";

describe("Wave A craft — calm loading + card system", () => {
  it("detects V2 surface paths for calm Suspense", () => {
    expect(isV2SurfacePath("/today")).toBe(true);
    expect(isV2SurfacePath("/today/mission")).toBe(true);
    expect(isV2SurfacePath("/today/coach-plan")).toBe(true);
    expect(isV2SurfacePath("/front-door")).toBe(true);
    expect(isV2SurfacePath("/ask-amy")).toBe(true);
    expect(isV2SurfacePath("/for-child")).toBe(true);
    expect(isV2SurfacePath("/premium")).toBe(true);
    expect(isV2SurfacePath("/dashboard")).toBe(false);
    expect(isV2SurfacePath("/sign-up")).toBe(true);
    expect(isV2SurfacePath("/landing")).toBe(false);
  });

  it("exposes Constitution surface / CTA / shell tokens (P0.4 materials)", () => {
    expect(V2_CARD).toMatch(/--v2-radius-plate/);
    expect(V2_CARD).toMatch(/--v2-fill-soft-plate/);
    expect(V2_CARD).not.toMatch(/backdrop-blur/);
    expect(V2_CARD_SOFT).toMatch(/shadow-none/);
    expect(V2_CARD_SOFT).not.toMatch(/backdrop-blur/);
    expect(V2_CARD_PANEL).toMatch(/--v2-elevation-elevated/);
    expect(V2_CARD_PANEL).not.toMatch(/backdrop-blur/);
    expect(V2_SHEET).toMatch(/--v2-blur-sheet/);
    expect(V2_CTA).toMatch(/--v2-button-height/);
    expect(V2_SHELL).toMatch(/px-6/);
  });

  it("Wave B press tokens compose on the same craft surface", () => {
    expect(V2_PRESS_PRIMARY).toMatch(/active:scale/);
    expect(V2_MOTION_MS.page).toBeGreaterThan(V2_MOTION_MS.tap);
  });
});
