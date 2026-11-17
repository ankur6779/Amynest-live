import { describe, expect, it } from "vitest";
import { AMY_ASTRO_LAUNCH_VISUAL } from "./amy-astro-card-config";
import {
  AMY_ASTRO_TILE_HERO_SRC,
  AMY_ASTRO_TILE_PORTRAIT_SRC,
} from "@/features/birth-sky/lib/branding";

describe("Amy Astronomy hub tile art", () => {
  it("keeps the hub launch cutout distinct from the in-module portrait", () => {
    expect(AMY_ASTRO_LAUNCH_VISUAL.heroSrc).toContain("amy-astro-hero.png");
    expect(AMY_ASTRO_LAUNCH_VISUAL.heroSrc).not.toContain("amy-astro-portrait.png");
    expect(AMY_ASTRO_TILE_HERO_SRC).toContain("amy-astro-hero.png");
    expect(AMY_ASTRO_TILE_PORTRAIT_SRC).toContain("amy-astro-portrait.png");
    expect(AMY_ASTRO_LAUNCH_VISUAL.heroSrc.split("?")[0]).not.toBe(
      AMY_ASTRO_TILE_PORTRAIT_SRC.split("?")[0],
    );
  });
});
