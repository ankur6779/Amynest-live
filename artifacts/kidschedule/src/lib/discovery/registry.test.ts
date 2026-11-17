import { describe, expect, it } from "vitest";
import type { AgeGroup } from "@/lib/age-groups";
import {
  DISCOVERY_MODULES,
  ageMatrixCell,
  isAgeEligible,
  isInfantCareDiscoveryAge,
  isMoreHrefVisibleForAge,
  resolveChildTotalMonths,
} from "./registry";

const GROUPS: AgeGroup[] = [
  "infant",
  "toddler",
  "preschool",
  "early_school",
  "pre_teen",
];

describe("discovery registry", () => {
  it("does not invent age bounds for unfiltered modules", () => {
    const unfiltered = DISCOVERY_MODULES.filter((m) => m.age.unfiltered);
    expect(unfiltered.map((m) => m.id)).toEqual(
      expect.arrayContaining(["today-plan", "amy", "amy-coach", "nutrition", "games", "rooms"]),
    );
    for (const mod of unfiltered) {
      expect(isAgeEligible(mod.age, 3)).toBe(true);
      expect(isAgeEligible(mod.age, 140)).toBe(true);
    }
  });

  it("keeps Infant Care on the Hub <24m window", () => {
    const care = DISCOVERY_MODULES.find((m) => m.id === "infant-care");
    expect(care?.age).toEqual({ unfiltered: false, minMonths: 0, maxMonthsExclusive: 24 });
    expect(isInfantCareDiscoveryAge(11)).toBe(true);
    expect(isInfantCareDiscoveryAge(23)).toBe(true);
    expect(isInfantCareDiscoveryAge(24)).toBe(false);
  });

  it("applies coded Speech Hub max of 132 months", () => {
    const speech = DISCOVERY_MODULES.find((m) => m.id === "speech-coach");
    expect(speech?.age.maxMonthsExclusive).toBe(132);
    expect(isAgeEligible(speech!.age, 131)).toBe(true);
    expect(isAgeEligible(speech!.age, 132)).toBe(false);
  });

  it("marks Health Lab premium and first-action only", () => {
    const hl = DISCOVERY_MODULES.find((m) => m.id === "health-lab");
    expect(hl?.entitlement).toBe("premium");
    expect(hl?.postFirstValueEligible).toBe(false);
    expect(hl?.afterFirstActionEligible).toBe(true);
  });

  it("classifies Teacher OS, Worksheet Studio, and Kids Control as non-discoverable", () => {
    const teacher = DISCOVERY_MODULES.find((m) => m.id === "teacher-os");
    const worksheets = DISCOVERY_MODULES.find((m) => m.id === "worksheets");
    const kids = DISCOVERY_MODULES.find((m) => m.id === "kids-control");
    expect(teacher?.classification).toBe("internal");
    expect(worksheets?.classification).toBe("internal");
    expect(kids?.classification).toBe("deprecated");
    expect(teacher?.afterFirstActionEligible).toBe(false);
    expect(worksheets?.afterFirstActionEligible).toBe(false);
    expect(kids?.afterFirstActionEligible).toBe(false);
    expect(isMoreHrefVisibleForAge("/teacher-os", 84)).toBe(false);
    expect(isMoreHrefVisibleForAge("/worksheet", 84)).toBe(false);
  });

  it("builds the age × module matrix from coded bounds", () => {
    const rows = DISCOVERY_MODULES.filter((m) =>
      ["today-plan", "infant-care", "speech-coach", "games", "grow-room", "olympiad"].includes(
        m.id,
      ),
    );
    const matrix = Object.fromEntries(
      rows.map((m) => [m.id, Object.fromEntries(GROUPS.map((g) => [g, ageMatrixCell(m, g)]))]),
    );
    expect(matrix["today-plan"]?.infant).toBe("AGE_UNFILTERED");
    expect(matrix["games"]?.infant).toBe("AGE_UNFILTERED");
    expect(matrix["infant-care"]?.infant).toBe("Y");
    expect(matrix["infant-care"]?.toddler).toBe("Y");
    expect(matrix["infant-care"]?.preschool).toBe("—");
    expect(matrix["grow-room"]?.infant).toBe("—");
    expect(matrix["grow-room"]?.preschool).toBe("Y");
    expect(matrix["olympiad"]?.toddler).toBe("—");
    expect(matrix["olympiad"]?.early_school).toBe("Y");
    expect(matrix["speech-coach"]?.pre_teen).toBe("—");
  });

  it("does not hide AGE_UNFILTERED More hrefs for infants", () => {
    expect(isMoreHrefVisibleForAge("/games", 6)).toBe(true);
    expect(isMoreHrefVisibleForAge("/nutrition", 6)).toBe(true);
    expect(isMoreHrefVisibleForAge("/study", 6)).toBe(false);
    expect(isMoreHrefVisibleForAge("/speech-coach", 6)).toBe(true);
    expect(isMoreHrefVisibleForAge("/speech-coach", 132)).toBe(false);
    expect(isMoreHrefVisibleForAge("/unknown-route", 6)).toBe(true);
  });

  it("resolves active child months without inventing age", () => {
    expect(resolveChildTotalMonths([], 1)).toBeNull();
    expect(resolveChildTotalMonths([{ id: 2, age: 4, ageMonths: 0 }], 2)).toBe(48);
    expect(resolveChildTotalMonths([{ id: 2, age: 0, ageMonths: 7 }], 9)).toBe(7);
    expect(resolveChildTotalMonths([{ id: 3, age: 1, ageMonths: 18 }], 3)).toBe(18);
  });

  it("registers Coloring and Curiosity as discoverable modules", () => {
    const coloring = DISCOVERY_MODULES.find((m) => m.id === "coloring-books");
    const curiosity = DISCOVERY_MODULES.find((m) => m.id === "curiosity");
    expect(coloring?.classification).toBe("discovery");
    expect(coloring?.href).toContain("coloring-books");
    expect(isAgeEligible(coloring!.age, 8)).toBe(true);
    expect(curiosity?.href).toBe("/answer-to-kids-how");
    expect(curiosity?.age.unfiltered).toBe(true);
  });
});
