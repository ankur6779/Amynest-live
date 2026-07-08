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
  it("never shows a connection error during normal startup", () => {
    expect(speechCoachConnectionLabel("idle", true)).toBe("Preparing Amy...");
    expect(speechCoachConnectionLabel("connecting", true)).toBe("Preparing Amy...");
    expect(speechCoachConnectionLabel("reconnecting", true)).toBe("Preparing Amy...");
    expect(speechCoachConnectionLabel("idle", false, { loading: true })).toBe(
      "Preparing Amy...",
    );
  });

  it("shows live states once connected", () => {
    expect(speechCoachConnectionLabel("connected", true)).toBe("Listening...");
    expect(
      speechCoachConnectionLabel("connected", true, { amySpeaking: true }),
    ).toBe("Amy is speaking");
  });

  it("reserves connection issue for real failures", () => {
    expect(speechCoachConnectionLabel("error", true)).toBe("Connection issue");
    expect(speechCoachConnectionLabel("disconnected", true)).toBe("Connection issue");
  });

  it("shows readiness before the session starts", () => {
    expect(speechCoachConnectionLabel("idle", false)).toBe("Ready to talk");
  });
});
