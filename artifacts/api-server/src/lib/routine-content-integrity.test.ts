import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyRoutineContentIntegrity,
  deduplicateEnvironmentalAdvice,
  ExplanationDiversityGuard,
  normalizeBedtimeDisplayTitles,
  resolveMealDisplayTitle,
  resolveSemanticDisplayTitle,
  validateAgeAppropriatePresentation,
} from "./routine-content-integrity.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

const SLEEP = 21 * 60;

function item(
  partial: Partial<RoutineScheduleItem> & Pick<RoutineScheduleItem, "time" | "activity">,
): RoutineScheduleItem {
  return {
    duration: 20,
    category: "play",
    status: "pending",
    ...partial,
  };
}

describe("resolveSemanticDisplayTitle — bedtime autonomy blocks", () => {
  it("renames puzzles title when notes describe evening prep", () => {
    const title = resolveSemanticDisplayTitle(
      item({
        time: "20:40",
        activity: "Puzzles or calm games",
        notes: "Autonomy: evening prep — pack bag, lay out clothes, or tidy space.",
        culturalTag: "autonomy_evening",
      }),
    );
    assert.equal(title, "Pack school bag");
  });

  it("renames play time when notes describe school prep", () => {
    const title = resolveSemanticDisplayTitle(
      item({
        time: "20:50",
        activity: "Play time",
        notes: "Lay out uniform, socks, shoes — saves 10 morning minutes.",
      }),
    );
    assert.equal(title, "School prep");
  });
});

describe("resolveMealDisplayTitle — breakfast title resolution", () => {
  it("prefers breakfast when play title hides meal options", () => {
    const title = resolveMealDisplayTitle(
      item({
        time: "08:35",
        activity: "Calm play together",
        category: "play",
        notes:
          "Options: Oatmeal with banana | Soft idli with sambar | Fruit mash — includes a proper morning meal.",
      }),
    );
    assert.equal(title, "Breakfast");
  });

  it("does not override genuine play blocks", () => {
    const title = resolveMealDisplayTitle(
      item({
        time: "10:00",
        activity: "Outdoor play",
        notes: "Park time with parent supervision.",
      }),
    );
    assert.equal(title, "Outdoor play");
  });
});

describe("deduplicateEnvironmentalAdvice — AQI deduplication", () => {
  it("collapses repeated AQI warnings into one block", () => {
    const spam =
      "Air quality is unhealthy — limit outdoor time and use a mask if you go out. " +
      "Aim for about 20 minutes outside, then head in. " +
      "Air quality is unhealthy — limit outdoor time and use protection. " +
      "Check local air quality updates during the day. " +
      "Offer water before and after outdoor time. " +
      "Keep outdoor sessions shorter than usual. " +
      "Avoid heavy running or sports outdoors. " +
      "Prefer light walking or calm play. " +
      "Air quality is unhealthy — limit outdoor time and use a mask if you go out. " +
      "Offer water before and after outdoor time. " +
      "Prefer light walking or calm play.";

    const out = deduplicateEnvironmentalAdvice(spam)!;
    assert.match(out, /Air quality is unhealthy today/i);
    assert.match(out, /Limit outdoor time to 20 minutes/i);
    assert.match(out, /Encourage hydration/i);
    const headlineCount = (out.match(/Air quality is unhealthy/gi) ?? []).length;
    assert.equal(headlineCount, 1);
  });
});

describe("ExplanationDiversityGuard — repeated explanations", () => {
  it("replaces generic filler with contextual reasons", () => {
    const guard = new ExplanationDiversityGuard();
    const all = [
      item({ time: "09:00", activity: "Creative project", category: "creative" }),
      item({ time: "12:00", activity: "Lunch", category: "meal" }),
      item({
        time: "11:00",
        activity: "Family time",
        notes: "Added to keep the day flowing naturally.",
      }),
    ];

    const first = guard.contextualize(
      all[2]!.notes,
      all[2]!,
      1,
      all,
    );
    assert.doesNotMatch(first!, /keep the day flowing naturally/i);
    assert.match(first!, /meal|movement|reset|evening|morning|afternoon|wind-down/i);

    const second = guard.contextualize(
      "Added to keep the day flowing naturally.",
      item({ time: "14:00", activity: "Quiet play" }),
      2,
      all,
    );
    assert.doesNotMatch(second!, /keep the day flowing naturally/i);
  });
});

describe("validateAgeAppropriatePresentation — preschool coding labels", () => {
  it("softens coding labels for preschool", () => {
    const out = validateAgeAppropriatePresentation(
      "Coding & Logic Puzzles",
      "preschool",
    );
    assert.equal(out, "Problem-solving games");
  });

  it("keeps coding labels for pre-teens", () => {
    const out = validateAgeAppropriatePresentation(
      "Coding & Logic Puzzles",
      "pre_teen",
    );
    assert.equal(out, "Coding & Logic Puzzles");
  });
});

describe("normalizeBedtimeDisplayTitles — bedtime zone cleanup", () => {
  it("never shows play time for prep in final 90 minutes", () => {
    const title = normalizeBedtimeDisplayTitles(
      item({
        time: "20:50",
        activity: "Play time",
        notes: "Lay out uniform, socks, shoes — saves 10 morning minutes.",
      }),
      SLEEP,
    );
    assert.equal(title, "School prep");
  });

  it("softens adventure time near bedtime when not truly playful", () => {
    const title = normalizeBedtimeDisplayTitles(
      item({
        time: "20:10",
        activity: "Adventure time",
        notes: "Tidy room and organize materials for tomorrow.",
        culturalTag: "autonomy_evening",
      }),
      SLEEP,
    );
    assert.equal(title, "Evening preparation");
  });
});

describe("applyRoutineContentIntegrity — meal vs play conflict", () => {
  it("fixes production-like evening sequence without changing timing", () => {
    const input: RoutineScheduleItem[] = [
      item({
        time: "08:35",
        activity: "Calm play together",
        duration: 25,
        notes: "Options: Oatmeal with banana | Soft idli with sambar.",
      }),
      item({
        time: "10:59",
        activity: "Coding & Logic Puzzles",
        duration: 25,
        category: "study",
      }),
      item({
        time: "20:40",
        activity: "Puzzles or calm games",
        duration: 10,
        notes: "Autonomy: evening prep — pack bag, lay out clothes, or tidy space.",
        culturalTag: "autonomy_evening",
      }),
      item({
        time: "20:50",
        activity: "Play time",
        duration: 10,
        notes: "Lay out uniform, socks, shoes — saves 10 morning minutes.",
      }),
      item({
        time: "21:00",
        activity: "Sleep Time",
        duration: 15,
        category: "sleep",
      }),
    ];

    const { items } = applyRoutineContentIntegrity(input, {
      sleepMins: SLEEP,
      ageGroup: "preschool",
    });

    assert.equal(items[0]!.activity, "Breakfast");
    assert.equal(items[0]!.time, "08:35");
    assert.equal(items[1]!.activity, "Problem-solving games");
    assert.equal(items[2]!.activity, "Pack school bag");
    assert.equal(items[3]!.activity, "School prep");
    assert.equal(items[4]!.activity, "Sleep Time");
    assert.equal(items[4]!.time, "21:00");
  });
});
