import { describe, expect, it, vi, beforeEach } from "vitest";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

import {
  trackAbacusHomeOpen,
  trackAbacusMentalCompleted,
  trackAbacusModeStarted,
} from "./abacus-analytics";

describe("abacus analytics", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("emits home open with context", () => {
    trackAbacusHomeOpen({ childId: 1, age: 6, language: "en", subscription: "free", level: 1 });
    expect(trackMock).toHaveBeenCalledWith(
      "abacus_home_open",
      expect.objectContaining({ childId: 1, age: 6 }),
    );
  });

  it("emits mode started + mental completed", () => {
    trackAbacusModeStarted({ childId: 2, age: 7, level: 2 }, "mental");
    trackAbacusMentalCompleted({ childId: 2, age: 7, level: 2 }, true, 1200);
    expect(trackMock).toHaveBeenCalledWith(
      "abacus_mode_started",
      expect.objectContaining({ mode: "mental" }),
    );
    expect(trackMock).toHaveBeenCalledWith(
      "abacus_mental_completed",
      expect.objectContaining({ correct: true, duration_ms: 1200 }),
    );
  });
});
