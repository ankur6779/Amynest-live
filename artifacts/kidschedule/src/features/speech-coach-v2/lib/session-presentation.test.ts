import { describe, expect, it } from "vitest";
import {
  AMY_STAGE_CANVAS,
  amyStageContainRect,
  amyStageEyeLayout,
} from "@/lib/amy/amy-stage-layout";
import { speechCoachConnectionLabel } from "./session-presentation";

describe("amy-stage-layout", () => {
  it("maps eye UVs inside the rendered contain rect", () => {
    const layout = amyStageEyeLayout(288, 358, AMY_STAGE_CANVAS.width, AMY_STAGE_CANVAS.height);
    expect(layout).not.toBeNull();
    const { rect, left, right } = layout!;
    expect(rect.width).toBeGreaterThan(0);
    expect(left.top).toBeGreaterThan(rect.top);
    expect(right.top).toBeGreaterThan(rect.top);
    expect(left.top).toBeLessThan(rect.top + rect.height * 0.7);
    expect(right.top).toBeLessThan(rect.top + rect.height * 0.7);
  });

  it("returns null when image dimensions are invalid", () => {
    expect(amyStageContainRect(100, 100, 0, 900)).toBeNull();
    expect(amyStageEyeLayout(100, 100, 0, 900)).toBeNull();
  });
});

describe("speechCoachConnectionLabel", () => {
  it("shows startup and listening copy without false errors", () => {
    expect(speechCoachConnectionLabel("idle", true)).toBe("Connecting...");
    expect(speechCoachConnectionLabel("connecting", true)).toBe("Connecting...");
    expect(speechCoachConnectionLabel("connected", true)).toBe("Listening");
    expect(speechCoachConnectionLabel("error", true)).toBe("Connection issue");
    expect(speechCoachConnectionLabel("idle", false)).toBe("Tap to start speaking with Amy");
  });
});
