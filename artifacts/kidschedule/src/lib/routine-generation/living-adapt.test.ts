import { describe, expect, it } from "vitest";
import {
  LIVING_ADAPT_CAPABILITIES,
  livingAdjustBandTitle,
  livingAdjustDetailsCta,
  livingDetailStartHere,
  livingExecutionHandoffNote,
  livingRegenFullTitle,
  livingRegenRestTitle,
  livingResultBeginCta,
  livingResultRebuildCta,
  livingRevealCraftingLine,
  livingRevealReadyEyebrow,
} from "./living-result";

describe("routine-generation living adapt (R4)", () => {
  it("separates Begin / Adjust / Rebuild language clearly", () => {
    expect(livingResultBeginCta().toLowerCase()).toBe("begin today");
    expect(livingAdjustBandTitle().toLowerCase()).toContain("adjust");
    expect(livingAdjustDetailsCta().toLowerCase()).toContain("change");
    expect(livingResultRebuildCta().toLowerCase()).toContain("rebuild");
    expect(livingExecutionHandoffNote().toLowerCase()).toMatch(/begin|save|first step|live/);
  });

  it("never uses unlock / AI theatre / configure-everything language", () => {
    const joined = [
      livingAdjustBandTitle(),
      livingAdjustDetailsCta(),
      livingExecutionHandoffNote(),
      livingRevealCraftingLine("Maya"),
      livingRevealReadyEyebrow(),
      livingRegenRestTitle(),
      livingRegenFullTitle(),
    ]
      .join(" ")
      .toLowerCase();
    expect(joined).not.toMatch(
      /\b(unlock|ai is thinking|patent|sparkle|configure everything|wizard|fomo)\b/,
    );
  });

  it("reveal handoff is quiet arrival — not crafting theatre", () => {
    expect(livingRevealReadyEyebrow().toLowerCase()).toBe("here it is");
    expect(livingRevealCraftingLine("Leo").toLowerCase()).toContain("leo");
    expect(livingRevealCraftingLine("Leo").toLowerCase()).not.toContain("crafting");
  });

  it("detail start-here line is actionable in a few seconds", () => {
    const line = livingDetailStartHere("Breakfast together", "8:00 AM");
    expect(line).toContain("Start here");
    expect(line).toContain("Breakfast together");
    expect(line).toContain("8:00 AM");
  });

  it("catalog marks only real capabilities as present; pre-save skip is FUTURE", () => {
    const present = LIVING_ADAPT_CAPABILITIES.filter((c) => c.status === "present");
    const future = LIVING_ADAPT_CAPABILITIES.filter((c) => c.status === "future");
    expect(present.some((c) => c.id === "begin_save")).toBe(true);
    expect(present.some((c) => c.id === "skip_complete_delay")).toBe(true);
    expect(present.some((c) => c.id === "partial_regen")).toBe(true);
    expect(future.some((c) => c.id === "presave_skip_swap")).toBe(true);
    for (const c of present) {
      expect(c.path.toUpperCase()).not.toBe("FUTURE");
    }
  });

  it("regen labels distinguish refresh remaining vs rebuild full", () => {
    expect(livingRegenRestTitle().toLowerCase()).toMatch(/refresh|remaining/);
    expect(livingRegenFullTitle().toLowerCase()).toContain("rebuild");
  });
});
