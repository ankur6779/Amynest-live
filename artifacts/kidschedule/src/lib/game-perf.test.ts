import { describe, expect, it } from "vitest";
import { GAME_PERF_STYLES, isLowPowerClient, isPageVisible, scheduleIdle } from "./game-perf";

describe("game-perf", () => {
  it("exports containment and low-power CSS hooks", () => {
    expect(GAME_PERF_STYLES).toContain("content-visibility");
    expect(GAME_PERF_STYLES).toContain("game-perf-low");
    expect(typeof isPageVisible()).toBe("boolean");
    expect(typeof isLowPowerClient()).toBe("boolean");
  });

  it("scheduleIdle returns a cancel function", async () => {
    let ran = false;
    const cancel = scheduleIdle(() => {
      ran = true;
    }, 50);
    expect(typeof cancel).toBe("function");
    cancel();
    await new Promise((r) => setTimeout(r, 80));
    expect(ran).toBe(false);
  });
});
