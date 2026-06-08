import { describe, expect, it } from "vitest";
import { bucketRecordingDurationMs, pickSmartTalkingAmyReaction } from "./talking-amy-reactions";
import { getTalkingAmyMode } from "./talking-amy-modes";

describe("talking-amy-reactions", () => {
  it("buckets duration correctly", () => {
    expect(bucketRecordingDurationMs(500)).toBe("tiny");
    expect(bucketRecordingDurationMs(1500)).toBe("short");
    expect(bucketRecordingDurationMs(4000)).toBe("medium");
    expect(bucketRecordingDurationMs(7000)).toBe("long");
  });

  it("returns a non-empty smart reaction", () => {
    const mode = getTalkingAmyMode("chipmunk");
    const line = pickSmartTalkingAmyReaction(mode, 2500);
    expect(line.length).toBeGreaterThan(0);
  });
});
