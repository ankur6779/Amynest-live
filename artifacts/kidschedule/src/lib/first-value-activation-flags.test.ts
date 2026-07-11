import { describe, expect, it, vi, beforeEach } from "vitest";

describe("first-value-activation-flags", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults activation master flag to true when unset", async () => {
    vi.stubEnv("VITE_FF_FIRST_VALUE_ACTIVATION", "");
    const mod = await import("./first-value-activation-flags");
    expect(mod.FF_FIRST_VALUE_ACTIVATION).toBe(true);
  });

  it("respects explicit disable", async () => {
    vi.stubEnv("VITE_FF_FIRST_VALUE_ACTIVATION", "0");
    const mod = await import("./first-value-activation-flags");
    expect(mod.FF_FIRST_VALUE_ACTIVATION).toBe(false);
  });
});
