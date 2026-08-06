import { describe, expect, it } from "vitest";
import {
  V2_BORDER,
  V2_GLOW,
  V2_LIGHT,
  V2_NAV,
  V2_SOFT_PLATE,
  V2_SPACE_PX,
  V2_TYPE,
} from "./constitution";
import { V2_WEIGHT_COACH, V2_WEIGHT_MISSION } from "./finish";
import {
  v2LawRole,
  V2_HIERARCHY_PEER,
  V2_HIERARCHY_RECEDE,
  V2_HIERARCHY_WHISPER,
} from "./hierarchy";

describe("P0.6 Law of Three hierarchy", () => {
  it("exposes peer / recede / whisper composition roles", () => {
    expect(V2_HIERARCHY_PEER).toBe("opacity-80");
    expect(V2_HIERARCHY_RECEDE).toBe("opacity-70");
    expect(V2_HIERARCHY_WHISPER).toBe("opacity-60");
    expect(v2LawRole("hero")).toEqual({ "data-v2-law": "hero" });
    expect(v2LawRole("primary")).toEqual({ "data-v2-law": "primary" });
    expect(v2LawRole("support")).toEqual({ "data-v2-law": "support" });
    expect(v2LawRole("recede")).toEqual({ "data-v2-law": "recede" });
  });

  it("Coach peer recedes · Mission stays full (no visual democracy)", () => {
    expect(V2_WEIGHT_COACH).toMatch(/opacity-80/);
    expect(V2_WEIGHT_MISSION).not.toMatch(/opacity-/);
  });
});

describe("P0.6 production drift check — only hierarchy evolved", () => {
  it("typography · spacing · navigation · materials · lighting unchanged", () => {
    expect(V2_TYPE.hero).toMatch(/--v2-type-hero/);
    expect(V2_TYPE.caption).toMatch(/--v2-type-caption/);
    expect(Object.values(V2_SPACE_PX)).toEqual([8, 16, 24, 32, 40, 48, 56, 64]);
    expect(V2_NAV.height).toBe("h-14");
    expect(V2_NAV.blur).toMatch(/--v2-blur-nav/);
    expect(V2_SOFT_PLATE).toMatch(/--v2-fill-soft-plate/);
    expect(V2_SOFT_PLATE).toMatch(/shadow-none/);
    expect(V2_BORDER.rim).toMatch(/--v2-rim/);
    expect(V2_GLOW.bloom).toBe("v2-bloom-light");
    expect(V2_GLOW.orb).toBe("v2-orb-emit");
    expect(V2_LIGHT).toEqual({
      morning: "morning",
      evening: "evening",
      night: "night",
    });
  });
});
