import { describe, expect, it } from "vitest";
import {
  buildRoutineContextChips,
  isRoutineContextSufficient,
  isRoutineLivingV1Enabled,
  livingRoutineBuildCta,
  livingRoutineLoadingHeadline,
  livingRoutineProductName,
  ROUTINE_HANDOFF_STAGES,
  routineLivingOpen,
  routineReadyMoment,
} from "./living-entry";

describe("routine-generation living-entry (R2)", () => {
  it("living flag defaults ON", () => {
    expect(isRoutineLivingV1Enabled()).toBe(true);
  });

  it("opens as understanding — never planner / AI theatre / unlock", () => {
    const open = routineLivingOpen("Maya");
    const joined =
      `${open.eyebrow} ${open.title} ${open.companionship} ${open.purpose}`.toLowerCase();
    expect(open.title).toContain("Maya");
    expect(joined).toMatch(/today|understand|enough|plan/);
    expect(joined).not.toMatch(
      /\b(generate ai|standard vs|setup wizard|patent|unlock|optimize|marketplace|sparkle)\b/,
    );
    expect(joined).not.toContain("wizard");
  });

  it("ready moment explains why / next / do — without configuration language", () => {
    const ready = routineReadyMoment("Leo");
    expect(ready.why).toContain("Leo");
    expect(ready.next.toLowerCase()).toMatch(/plan|school|rest|meals/);
    expect(ready.doNext.toLowerCase()).toContain("build today's plan");
    expect(`${ready.why} ${ready.next} ${ready.doNext}`.toLowerCase()).not.toMatch(
      /configure|wizard|generate with ai/,
    );
  });

  it("primary CTA is Build today's plan", () => {
    expect(livingRoutineBuildCta()).toBe("Build today's plan");
    expect(livingRoutineBuildCta(true)).toBe("Rebuild today's plan");
    expect(livingRoutineProductName().toLowerCase()).toBe("today's plan");
    expect(livingRoutineLoadingHeadline("Amy").toLowerCase()).toContain("shaping today");
  });

  it("handoff stages are truthful — no model / patent / magic theatre", () => {
    expect(ROUTINE_HANDOFF_STAGES.length).toBeGreaterThanOrEqual(3);
    const joined = ROUTINE_HANDOFF_STAGES.join(" ").toLowerCase();
    expect(joined).not.toMatch(/gpt|claude|patent|magic|sparkle|chain.of.thought/);
  });

  it("builds only verified context chips with source mapping", () => {
    const chips = buildRoutineContextChips({
      childName: "Maya",
      ageYears: 6,
      ageMonths: 0,
      goals: "More calm mornings",
      dateIso: "2026-08-10", // Monday
      hasSchool: true,
      schoolQuestionRequired: true,
      caregiver: "mom",
      weatherOutdoor: "yes",
      hasExistingRoutine: false,
      priorRoutineCount: 3,
    });
    const ids = chips.map((c) => c.id);
    expect(ids).toContain("rhythm");
    expect(ids).toContain("stage");
    expect(ids).toContain("focus");
    expect(ids).toContain("caregiver");
    expect(ids).toContain("weather");
    expect(ids).toContain("continuity");
    for (const chip of chips) {
      expect(chip.source.length).toBeGreaterThan(3);
      expect(chip.field.length).toBeGreaterThan(2);
      expect(chip.label.length).toBeGreaterThan(0);
    }
    expect(chips.find((c) => c.id === "rhythm")?.label.toLowerCase()).toContain("school");
  });

  it("does not invent focus or weather chips when missing", () => {
    const chips = buildRoutineContextChips({
      childName: "Sam",
      ageYears: 2,
      dateIso: "2026-08-09", // Sunday
      hasSchool: false,
      schoolQuestionRequired: false,
      caregiver: null,
      weatherOutdoor: null,
      goals: null,
      priorRoutineCount: 0,
    });
    expect(chips.some((c) => c.id === "focus")).toBe(false);
    expect(chips.some((c) => c.id === "weather")).toBe(false);
    expect(chips.some((c) => c.id === "caregiver")).toBe(false);
    expect(chips.some((c) => c.id === "stage")).toBe(true);
    expect(chips.some((c) => c.id === "rhythm")).toBe(true);
  });

  it("context sufficient only when child+date+school resolved", () => {
    expect(
      isRoutineContextSufficient({
        childId: "c1",
        dateIso: "2026-08-08",
        schoolQuestionRequired: true,
        hasSchool: null,
      }),
    ).toBe(false);
    expect(
      isRoutineContextSufficient({
        childId: "c1",
        dateIso: "2026-08-08",
        schoolQuestionRequired: true,
        hasSchool: true,
      }),
    ).toBe(true);
    expect(
      isRoutineContextSufficient({
        childId: "c1",
        dateIso: "2026-08-08",
        schoolQuestionRequired: false,
        hasSchool: null,
      }),
    ).toBe(true);
  });
});
