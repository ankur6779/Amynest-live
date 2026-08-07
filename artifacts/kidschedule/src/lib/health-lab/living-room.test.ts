import { describe, expect, it } from "vitest";
import {
  HEALTH_LAB_QUIET_PATHS,
  isHealthLabLivingV1Enabled,
  recommendHealthLabAction,
} from "./living-room";

describe("health-lab living-room", () => {
  it("exposes five quiet wellness paths", () => {
    expect(HEALTH_LAB_QUIET_PATHS).toHaveLength(5);
  });

  it("recommends matching path for engine-picked game", () => {
    const r = recommendHealthLabAction("flamingo-balance");
    expect(r.gameId).toBe("flamingo-balance");
    expect(r.title).toBe("Balance");
  });

  it("falls back to breath when unknown", () => {
    const r = recommendHealthLabAction("calmness-meter");
    expect(r.gameId).toBe("breath-control");
  });

  it("living flag defaults ON", () => {
    expect(isHealthLabLivingV1Enabled()).toBe(true);
  });
});
