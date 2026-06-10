import type { PlaygroundActivityId, PlaygroundAgeBand } from "./types";

export function ageYearsToBand(ageYears: number): PlaygroundAgeBand {
  if (ageYears <= 3) return "2-3";
  if (ageYears <= 5) return "4-5";
  if (ageYears <= 7) return "6-7";
  return "7-8";
}

export const AGE_LIMITS: Record<
  PlaygroundAgeBand,
  {
    countMin: number;
    countMax: number;
    addMax: number;
    subMax: number;
    mulGroupsMax: number;
    mulPerGroupMax: number;
    divTotalMax: number;
    divRecipientsMax: number;
  }
> = {
  "2-3": {
    countMin: 2,
    countMax: 5,
    addMax: 0,
    subMax: 0,
    mulGroupsMax: 0,
    mulPerGroupMax: 0,
    divTotalMax: 0,
    divRecipientsMax: 0,
  },
  "4-5": {
    countMin: 3,
    countMax: 10,
    addMax: 5,
    subMax: 5,
    mulGroupsMax: 0,
    mulPerGroupMax: 0,
    divTotalMax: 0,
    divRecipientsMax: 0,
  },
  "6-7": {
    countMin: 4,
    countMax: 12,
    addMax: 10,
    subMax: 10,
    mulGroupsMax: 5,
    mulPerGroupMax: 5,
    divTotalMax: 0,
    divRecipientsMax: 0,
  },
  "7-8": {
    countMin: 5,
    countMax: 15,
    addMax: 12,
    subMax: 12,
    mulGroupsMax: 6,
    mulPerGroupMax: 6,
    divTotalMax: 12,
    divRecipientsMax: 4,
  },
};

export function isActivityUnlocked(
  activityId: PlaygroundActivityId,
  ageYears: number,
): boolean {
  const minAges: Record<PlaygroundActivityId, number> = {
    counting_adventure: 2,
    math_puzzles: 2,
    daily_challenge: 2,
    addition_lab: 4,
    subtraction_garden: 4,
    multiplication_factory: 6,
    division_bakery: 7,
    number_patterns: 6,
  };
  return ageYears >= minAges[activityId];
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function dailySeed(childId: number, date = todayIsoDate()): number {
  let h = childId;
  for (let i = 0; i < date.length; i++) {
    h = (h << 5) - h + date.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}
