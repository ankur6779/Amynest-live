import { describe, expect, it } from "vitest";
import {
  BIRTH_SKY_QUIET_PATHS,
  isBirthSkyLivingV1Enabled,
  recommendBirthSkyAction,
} from "./living-room";

describe("birth-sky living-room", () => {
  it("exposes three quiet understanding paths", () => {
    expect(BIRTH_SKY_QUIET_PATHS).toHaveLength(3);
    expect(BIRTH_SKY_QUIET_PATHS.map((p) => p.id)).toEqual([
      "portrait",
      "patterns",
      "reflect",
    ]);
  });

  it("recommends begin understanding", () => {
    const r = recommendBirthSkyAction();
    expect(r.id).toBe("begin");
    expect(r.title).toBe("See them more clearly");
  });

  it("living flag defaults ON", () => {
    expect(isBirthSkyLivingV1Enabled()).toBe(true);
  });
});
