import { describe, it, expect } from "vitest";
import {
  getPhonicsAgeGroup,
  getPhonicsLevel,
  PHONICS_LEVELS,
} from "./phonics-content";

describe("phonics-content – age routing", () => {
  it("returns null below 12 months", () => {
    expect(getPhonicsAgeGroup(0)).toBeNull();
    expect(getPhonicsAgeGroup(11)).toBeNull();
  });

  it("returns 12_24m for 12–23 months", () => {
    expect(getPhonicsAgeGroup(12)).toBe("12_24m");
    expect(getPhonicsAgeGroup(23)).toBe("12_24m");
  });

  it("returns 2_3y for 24–35 months", () => {
    expect(getPhonicsAgeGroup(24)).toBe("2_3y");
    expect(getPhonicsAgeGroup(35)).toBe("2_3y");
  });

  it("returns 3_4y for 36–47 months", () => {
    expect(getPhonicsAgeGroup(36)).toBe("3_4y");
    expect(getPhonicsAgeGroup(47)).toBe("3_4y");
  });

  it("returns 4_5y for 48–59 months", () => {
    expect(getPhonicsAgeGroup(48)).toBe("4_5y");
    expect(getPhonicsAgeGroup(59)).toBe("4_5y");
  });

  it("returns 5_6y for 60–71 months", () => {
    expect(getPhonicsAgeGroup(60)).toBe("5_6y");
    expect(getPhonicsAgeGroup(71)).toBe("5_6y");
  });

  it("returns null at and above 72 months (6 years)", () => {
    expect(getPhonicsAgeGroup(72)).toBeNull();
    expect(getPhonicsAgeGroup(120)).toBeNull();
  });
});

describe("phonics-content – level metadata", () => {
  it("provides all 5 age levels", () => {
    expect(Object.keys(PHONICS_LEVELS).sort()).toEqual(
      ["12_24m", "2_3y", "3_4y", "4_5y", "5_6y"].sort(),
    );
  });

  it("each level has at least 5 items, a focus, and parent tips", () => {
    for (const level of Object.values(PHONICS_LEVELS)) {
      expect(level.items.length).toBeGreaterThanOrEqual(5);
      expect(level.focus.length).toBeGreaterThan(0);
      expect(level.parentTips.length).toBeGreaterThan(0);
    }
  });

  it("blending is enabled from age 3 onwards", () => {
    expect(PHONICS_LEVELS["12_24m"].features.blending).toBeFalsy();
    expect(PHONICS_LEVELS["2_3y"].features.blending).toBeFalsy();
    expect(PHONICS_LEVELS["3_4y"].features.blending).toBe(true);
    expect(PHONICS_LEVELS["4_5y"].features.blending).toBe(true);
    expect(PHONICS_LEVELS["5_6y"].features.blending).toBe(true);
  });

  it("sentence reading is enabled from age 4 onwards", () => {
    expect(PHONICS_LEVELS["3_4y"].features.sentenceReading).toBeFalsy();
    expect(PHONICS_LEVELS["4_5y"].features.sentenceReading).toBe(true);
    expect(PHONICS_LEVELS["5_6y"].features.sentenceReading).toBe(true);
  });

  it("each item has a unique id, a symbol, and a sound", () => {
    for (const level of Object.values(PHONICS_LEVELS)) {
      const ids = new Set<string>();
      for (const it of level.items) {
        expect(it.id).toBeTruthy();
        expect(it.symbol).toBeTruthy();
        expect(it.sound).toBeTruthy();
        expect(ids.has(it.id)).toBe(false);
        ids.add(it.id);
      }
    }
  });

  it("getPhonicsLevel returns the correct level object for a given age", () => {
    expect(getPhonicsLevel(18)?.ageGroup).toBe("12_24m");
    expect(getPhonicsLevel(30)?.ageGroup).toBe("2_3y");
    expect(getPhonicsLevel(42)?.ageGroup).toBe("3_4y");
    expect(getPhonicsLevel(54)?.ageGroup).toBe("4_5y");
    expect(getPhonicsLevel(66)?.ageGroup).toBe("5_6y");
    expect(getPhonicsLevel(80)).toBeNull();
  });
});
