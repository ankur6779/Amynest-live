import { describe, expect, it } from "vitest";
import {
  GAME_PERF_STYLES,
  isLowPowerClient,
  isPageVisible,
  scheduleIdle,
  shouldReduceGameEffects,
} from "./game-perf";

describe("game-perf", () => {
  it("exports containment and low-power CSS hooks", () => {
    expect(GAME_PERF_STYLES).toContain("content-visibility");
    expect(GAME_PERF_STYLES).toContain("game-perf-low");
    expect(GAME_PERF_STYLES).toContain("game-hub-frozen");
    expect(GAME_PERF_STYLES).toContain("gameTargetLife");
    expect(typeof isPageVisible()).toBe("boolean");
    expect(typeof isLowPowerClient()).toBe("boolean");
    expect(typeof shouldReduceGameEffects()).toBe("boolean");
  });

  it("does not mark ordinary 4-core devices as low-power without Save-Data / low memory", () => {
    const nav = navigator as Navigator & {
      hardwareConcurrency?: number;
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const prevC = nav.hardwareConcurrency;
    const prevM = nav.deviceMemory;
    const prevConn = nav.connection;
    try {
      Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 4 });
      Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 4 });
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: false, effectiveType: "4g" },
      });
      expect(isLowPowerClient()).toBe(false);
    } finally {
      Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: prevC });
      Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: prevM });
      Object.defineProperty(navigator, "connection", { configurable: true, value: prevConn });
    }
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
