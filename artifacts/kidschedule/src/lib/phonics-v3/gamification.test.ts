import { describe, expect, it } from "vitest";
import {
  SATPIN_WORLDS,
  getSatpinWorld,
  worldUnlockStatus,
  ADVENTURE_PATH,
} from "./satpin-worlds";
import {
  defaultReadingPetState,
  feedReadingPet,
  petStage,
  setReadingPetKind,
} from "./reading-pet";
import {
  buildDailyMotivationCard,
  claimDailyBonus,
  defaultDailyMotivationState,
  gentlePracticeDays,
  recordPracticeDay,
} from "./daily-motivation";
import { buildParentEncouragement } from "./parent-encouragement";
import { LETTER_INTRODUCTION_GROUPS } from "@workspace/phonics-curriculum";

describe("SATPIN worlds (presentation)", () => {
  it("maps one world per letter group without changing curriculum", () => {
    expect(SATPIN_WORLDS).toHaveLength(LETTER_INTRODUCTION_GROUPS.length);
    expect(getSatpinWorld(1).name).toMatch(/Sunny/);
    expect(worldUnlockStatus(2, 1)).toBe("completed");
    expect(worldUnlockStatus(2, 2)).toBe("current");
    expect(worldUnlockStatus(2, 3)).toBe("locked");
    expect(ADVENTURE_PATH).toHaveLength(7);
  });
});

describe("Reading pet", () => {
  it("grows from lessons and words", () => {
    let pet = defaultReadingPetState("owl");
    pet = feedReadingPet(pet, { lesson: true, words: 5, pronunciation: true });
    expect(pet.lessonsCompleted).toBe(1);
    expect(pet.growth).toBeGreaterThan(0);
    expect(petStage(pet.growth)).not.toBe("strong");
    pet = setReadingPetKind(pet, "dragon");
    expect(pet.kind).toBe("dragon");
  });
});

describe("Daily motivation", () => {
  it("records practice gently and claims bonus once per day", () => {
    let state = defaultDailyMotivationState();
    state = recordPracticeDay(state, new Date("2026-07-18T10:00:00Z"));
    state = recordPracticeDay(state, new Date("2026-07-18T18:00:00Z"));
    expect(state.practiceDays).toHaveLength(1);
    expect(gentlePracticeDays(state)).toBeGreaterThanOrEqual(0);

    const first = claimDailyBonus(state);
    expect(first.claimed).toBe(true);
    const second = claimDailyBonus(first.state);
    expect(second.claimed).toBe(false);

    const card = buildDailyMotivationCard({
      letterGroupIndex: 1,
      childId: 7,
      now: new Date("2026-07-18T12:00:00Z"),
    });
    expect(card.title.length).toBeGreaterThan(0);
  });
});

describe("Parent encouragement", () => {
  it("returns warm concrete lines", () => {
    const e = buildParentEncouragement({
      childName: "Aya",
      letterGroupIndex: 2,
      wordsRead: 18,
      storiesCompleted: 1,
      lessonsThisWeek: 3,
    });
    expect(e.headline).toContain("Aya");
    expect(e.homeTip.length).toBeGreaterThan(10);
    expect(e.nextWorldHint).toMatch(/world|World|adventure/i);
  });
});
