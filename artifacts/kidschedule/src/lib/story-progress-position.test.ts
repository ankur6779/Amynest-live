import { describe, expect, it } from "vitest";
import { resolveStorySessionStartPositionSec } from "./story-progress-position";

describe("resolveStorySessionStartPositionSec", () => {
  it("uses saved resume when autoplay reports ~0 before seek", () => {
    expect(resolveStorySessionStartPositionSec(0, 187)).toBe(187);
    expect(resolveStorySessionStartPositionSec(0.4, 187)).toBe(187);
  });

  it("uses currentTime once playback has caught the resume point", () => {
    expect(resolveStorySessionStartPositionSec(190, 187)).toBe(190);
  });

  it("keeps near-zero for brand-new watches", () => {
    expect(resolveStorySessionStartPositionSec(0, 0)).toBe(0);
    expect(resolveStorySessionStartPositionSec(0, undefined)).toBe(0);
  });
});
