import { describe, expect, it } from "vitest";
import {
  toComputeStatus,
  toGenerationState,
  userFacingGenerationMessage,
} from "./snapshot-generation";

describe("snapshot generation states", () => {
  it("maps states to computeStatus", () => {
    expect(toComputeStatus("PENDING")).toBe("pending");
    expect(toComputeStatus("COMPUTING")).toBe("computing");
    expect(toComputeStatus("READY")).toBe("ready");
    expect(toComputeStatus("FAILED")).toBe("failed");
  });

  it("normalizes wire values", () => {
    expect(toGenerationState("ready")).toBe("READY");
    expect(toGenerationState("COMPUTING")).toBe("COMPUTING");
    expect(toGenerationState(undefined)).toBe("PENDING");
  });

  it("never exposes internal pipeline terminology in user copy", () => {
    const msgs = [
      userFacingGenerationMessage("timeout"),
      userFacingGenerationMessage("network_failure"),
      userFacingGenerationMessage("compute_failed"),
      userFacingGenerationMessage("ephemeris_unavailable"),
      userFacingGenerationMessage("astro_generation"),
    ];
    for (const m of msgs) {
      expect(m.toLowerCase()).not.toContain("pipeline");
      expect(m.toLowerCase()).not.toContain("ephemeris");
      expect(m.toLowerCase()).not.toContain("astro_generation");
      expect(m.toLowerCase()).not.toContain("compute_failed");
      expect(m.length).toBeGreaterThan(10);
    }
  });
});
