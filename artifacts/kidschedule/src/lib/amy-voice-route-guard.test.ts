import { describe, it, expect, vi, beforeEach } from "vitest";

const { pauseMock } = vi.hoisted(() => ({
  pauseMock: vi.fn(),
}));

vi.mock("@/lib/amy-voice-controller", () => ({
  amyVoiceController: { pause: pauseMock },
}));

import {
  isAmyCoachWinsRoute,
  pauseAmyVoiceOnAmyCoachLeave,
} from "@/lib/amy-voice-route-guard";

describe("amy-voice-route-guard", () => {
  beforeEach(() => {
    pauseMock.mockReset();
  });

  it("detects the Amy Coach wins route", () => {
    expect(isAmyCoachWinsRoute("/amy-coach")).toBe(true);
    expect(isAmyCoachWinsRoute("/amy-coach/progress")).toBe(false);
  });

  it("pauses when leaving the wins screen for any destination", () => {
    pauseAmyVoiceOnAmyCoachLeave("/amy-coach", "/parenting-hub");
    pauseAmyVoiceOnAmyCoachLeave("/amy-coach", "/amy-coach/progress");
    expect(pauseMock).toHaveBeenCalledTimes(2);
  });

  it("does not pause when entering the wins screen", () => {
    pauseAmyVoiceOnAmyCoachLeave("/dashboard", "/amy-coach");
    expect(pauseMock).not.toHaveBeenCalled();
  });
});
