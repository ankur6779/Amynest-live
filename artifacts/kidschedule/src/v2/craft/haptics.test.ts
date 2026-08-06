import { afterEach, describe, expect, it, vi } from "vitest";
import { v2HapticLight, v2HapticSuccess } from "./haptics";

vi.mock("@/lib/navigation-haptics", () => ({
  hapticNavTransition: vi.fn(),
}));

vi.mock("@/lib/capacitor-native", () => ({
  isCapacitorNative: () => false,
}));

describe("v2 craft haptics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops when reduced motion is on", async () => {
    const { hapticNavTransition } = await import("@/lib/navigation-haptics");
    v2HapticLight(true);
    v2HapticSuccess(true);
    expect(hapticNavTransition).not.toHaveBeenCalled();
  });

  it("light haptic delegates to navigation haptic", async () => {
    const { hapticNavTransition } = await import("@/lib/navigation-haptics");
    v2HapticLight(false);
    expect(hapticNavTransition).toHaveBeenCalledTimes(1);
  });
});
