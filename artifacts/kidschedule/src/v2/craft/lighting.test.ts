import { afterEach, describe, expect, it } from "vitest";
import {
  V2_BORDER,
  V2_NAV,
  V2_SOFT_PLATE,
  V2_SPACE_PX,
  V2_TYPE,
} from "./constitution";
import {
  getV2SessionLightPreset,
  installV2Light,
  resetV2SessionLightForTests,
  resolveV2LightPreset,
  v2LitProps,
  V2_BLOOM_LIGHT,
  V2_LIGHT,
  V2_LIGHT_FIELD,
  V2_ORB_EMIT,
} from "./lighting";

describe("P0.5 lighting — three presets only", () => {
  afterEach(() => {
    resetV2SessionLightForTests();
    document.documentElement.removeAttribute("data-v2-light");
  });

  it("resolves Morning · Evening · Night from hour (no fourth mood)", () => {
    expect(resolveV2LightPreset(new Date("2026-08-04T07:00:00"))).toBe(
      V2_LIGHT.morning,
    );
    expect(resolveV2LightPreset(new Date("2026-08-04T15:00:00"))).toBe(
      V2_LIGHT.evening,
    );
    expect(resolveV2LightPreset(new Date("2026-08-04T22:00:00"))).toBe(
      V2_LIGHT.night,
    );
    expect(resolveV2LightPreset(new Date("2026-08-04T02:00:00"))).toBe(
      V2_LIGHT.night,
    );
    expect(Object.values(V2_LIGHT)).toEqual(["morning", "evening", "night"]);
  });

  it("Bloom is light-escape class · Orb is ambient emit (no neon ring)", () => {
    expect(V2_BLOOM_LIGHT).toBe("v2-bloom-light");
    expect(V2_ORB_EMIT).toBe("v2-orb-emit");
    expect(V2_ORB_EMIT).not.toMatch(/ring-/);
  });

  it("v2LitProps installs preset + light field without inventing materials", () => {
    const lit = v2LitProps("mx-auto flex");
    expect(lit.className).toContain(V2_LIGHT_FIELD);
    expect(lit["data-v2-light"]).toBe(getV2SessionLightPreset());
    expect(document.documentElement.getAttribute("data-v2-light")).toBe(
      lit["data-v2-light"],
    );
  });

  it("installV2Light can force a preset", () => {
    installV2Light(V2_LIGHT.night);
    expect(document.documentElement.getAttribute("data-v2-light")).toBe(
      "night",
    );
  });
});

describe("P0.5 production drift check — only lighting evolved", () => {
  it("typography · spacing · navigation · Soft Plate unchanged", () => {
    expect(V2_TYPE.hero).toMatch(/--v2-type-hero/);
    expect(V2_TYPE.caption).toMatch(/--v2-type-caption/);
    expect(Object.values(V2_SPACE_PX)).toEqual([8, 16, 24, 32, 40, 48, 56, 64]);
    expect(V2_NAV.height).toBe("h-14");
    expect(V2_NAV.icon).toMatch(/--v2-icon-nav/);
    expect(V2_NAV.bar).toMatch(/--v2-blur-nav/);
    expect(V2_SOFT_PLATE).toMatch(/--v2-fill-soft-plate/);
    expect(V2_SOFT_PLATE).toMatch(/shadow-none/);
    expect(V2_SOFT_PLATE).not.toMatch(/backdrop-blur/);
    expect(V2_BORDER.rim).toMatch(/--v2-rim/);
  });
});
