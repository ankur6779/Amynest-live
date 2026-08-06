import { describe, expect, it } from "vitest";
import {
  V2_BLOOM_CTA,
  V2_DURATION_MS,
  V2_EASE,
  V2_GHOST_CTA,
  V2_GLOW,
  V2_LAYOUT,
  V2_LIGHT,
  V2_MEASURE,
  V2_NAV,
  V2_ORB,
  V2_PRESS_SCALE,
  V2_SECONDARY_CTA,
  V2_SHELL,
  V2_SPACE_PX,
  V2_TYPE,
} from "./constitution";

describe("P0.1 Design Constitution tokens", () => {
  it("spacing ladder is 8→64 only", () => {
    expect(Object.values(V2_SPACE_PX)).toEqual([8, 16, 24, 32, 40, 48, 56, 64]);
  });

  it("motion family matches Constitution", () => {
    expect(V2_DURATION_MS).toEqual({
      micro: 120,
      ui: 220,
      page: 320,
      ritual: 480,
      celebrationMax: 1000,
    });
    expect(V2_EASE).toEqual([0.22, 1, 0.36, 1]);
    expect(V2_PRESS_SCALE).toBe(0.97);
  });

  it("shell / CTA / nav bind Nest Presence system vars (no screen-owned magic)", () => {
    expect(V2_SHELL).toMatch(/--v2-shell-max/);
    expect(V2_SHELL).toMatch(/px-6/);
    expect(V2_SHELL).toMatch(/py-8/);
    expect(V2_SHELL).toMatch(/gap-12/);
    expect(V2_BLOOM_CTA).toMatch(/--v2-button-height/);
    expect(V2_BLOOM_CTA).toMatch(/--v2-radius-button/);
    expect(V2_SECONDARY_CTA).toMatch(/--v2-fill-soft-plate/);
    expect(V2_GHOST_CTA).toMatch(/--v2-button-height/);
    expect(V2_NAV.height).toBe("h-14");
    expect(V2_TYPE.hero).toMatch(/--v2-type-hero/);
    expect(V2_TYPE.heroCompact).toMatch(/--v2-type-hero/);
    expect(V2_TYPE.caption).toMatch(/--v2-type-caption/);
    expect(V2_MEASURE.hero).toBe("max-w-[18ch]");
    expect(V2_MEASURE.support).toMatch(/--v2-measure-support/);
    expect(V2_MEASURE.sheet).toMatch(/--v2-sheet-max/);
    expect(V2_LAYOUT.viewport).toMatch(/100dvh/);
  });

  it("P0.3 whisper nav — Sheet Glass · soft fill · light progress · no Bloom chrome", () => {
    expect(V2_NAV.blur).toMatch(/--v2-blur-nav/);
    expect(V2_NAV.bar).toMatch(/--v2-blur-nav/);
    expect(V2_NAV.bar).toMatch(/border-0/);
    expect(V2_NAV.bar).toMatch(/shadow-none/);
    expect(V2_NAV.safeBottom).toMatch(/safe-area-inset-bottom/);
    expect(V2_NAV.icon).toMatch(/--v2-icon-nav/);
    expect(V2_NAV.tabActive).toMatch(/--v2-radius-nav-active/);
    expect(V2_NAV.tabActive).toMatch(/bg-foreground\/\[0\.06\]/);
    expect(V2_NAV.tabActive).not.toMatch(/primary/);
    expect(V2_NAV.progressFill).toMatch(/bg-foreground\/25/);
    expect(V2_NAV.progressFill).not.toMatch(/primary/);
  });

  it("P0.2 rhythm roles stay on the 8→64 ladder", async () => {
    const { V2_SPACE } = await import("./constitution");
    const ladder = new Set([8, 16, 24, 32, 40, 48, 56, 64]);
    const twToPx: Record<string, number> = {
      "2": 8,
      "4": 16,
      "6": 24,
      "8": 32,
      "10": 40,
      "12": 48,
      "14": 56,
      "16": 64,
    };
    for (const [key, cls] of Object.entries(V2_SPACE)) {
      if (typeof cls !== "string") continue;
      const parts = cls.split(/\s+/);
      for (const part of parts) {
        const m = part.match(/^(?:gap|space-y|p|px|py|pt|pb|pl|pr|mt|mb)-(\d+)$/);
        if (!m) continue;
        const px = twToPx[m[1]];
        expect(px, `${key} → ${part}`).toBeDefined();
        expect(ladder.has(px!), `${key} → ${part} (${px})`).toBe(true);
      }
    }
  });

  it("P0.5 lighting — Bloom emit classes · Orb ambient · three presets", () => {
    expect(V2_GLOW.bloom).toBe("v2-bloom-light");
    expect(V2_GLOW.orb).toBe("v2-orb-emit");
    expect(V2_ORB.emit).toBe("v2-orb-emit");
    expect(V2_ORB.ring).not.toMatch(/ring-/);
    expect(V2_LIGHT).toEqual({
      morning: "morning",
      evening: "evening",
      night: "night",
    });
  });

  it("P0.4 four materials — Soft Plate flat · Sheet Glass blur · Elevated lift · Atmosphere", async () => {
    const {
      V2_ATMOSPHERE,
      V2_ATMOSPHERE_SCRIM,
      V2_SOFT_PLATE,
      V2_SHEET_GLASS,
      V2_ELEVATED_PLATE,
      V2_SURFACE_FILL,
      V2_BORDER,
      V2_FIELD,
      V2_CHIP,
    } = await import("./constitution");

    expect(V2_ATMOSPHERE).toBe("bg-background");
    expect(V2_ATMOSPHERE_SCRIM).toMatch(/--v2-scrim/);
    expect(V2_SURFACE_FILL.softPlate).toMatch(/--v2-fill-soft-plate/);
    expect(V2_SURFACE_FILL.sheetGlass).toMatch(/--v2-fill-sheet/);
    expect(V2_BORDER.rim).toMatch(/--v2-rim/);
    expect(V2_BORDER.hairline).toBe(V2_BORDER.rim);

    expect(V2_SOFT_PLATE).toMatch(/--v2-radius-plate/);
    expect(V2_SOFT_PLATE).toMatch(/shadow-none/);
    expect(V2_SOFT_PLATE).not.toMatch(/backdrop-blur/);
    expect(V2_SHEET_GLASS).toMatch(/--v2-blur-sheet/);
    expect(V2_SHEET_GLASS).toMatch(/--v2-elevation-elevated/);
    expect(V2_ELEVATED_PLATE).toMatch(/--v2-elevation-elevated/);
    expect(V2_ELEVATED_PLATE).not.toMatch(/backdrop-blur/);
    expect(V2_FIELD).toMatch(/--v2-radius-field/);
    expect(V2_CHIP).toMatch(/--v2-radius-pill/);
    expect(V2_CHIP).toMatch(/border-0/);
  });
});
