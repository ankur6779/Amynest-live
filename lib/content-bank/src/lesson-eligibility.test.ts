import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SmartStudyLesson } from "./types.js";
import type { ContentBankUnlockContext } from "./types.js";
import {
  filterEligibleSmartStudyLessons,
  validateLessonEligibility,
  minAgeBandIndex,
  isFreshLessonStateValid,
  pickFirstEligibleLessonId,
} from "./lesson-eligibility.js";
import { filterUnlockedCatalog } from "./unlock.js";
import { buildFreshLessonSequence, resolveFreshLessonOnLogin, emptyFreshLessonState } from "./fresh-lesson-state.js";
import { emptyLessonVisibility } from "./lesson-visibility.js";

function lesson(
  id: string,
  ageBand: SmartStudyLesson["ageBand"],
  subject = "Addition",
): SmartStudyLesson {
  return {
    id,
    ageBand,
    subject,
    difficulty: "easy",
    learningLevel: 2,
    title: `Lesson ${id} (Ages ${ageBand})`,
    description: "Short description",
    lessonContent: "Word ".repeat(40).trim(),
    questions: ["Q1?"],
    answers: ["A1"],
    funFact: "Fun",
    amyExplanation: "Amy",
    audioText: "Listen",
  };
}

function ctx(
  overrides: Partial<ContentBankUnlockContext> & Pick<ContentBankUnlockContext, "childAge">,
): ContentBankUnlockContext {
  return {
    learningLevel: 3,
    masteryScore: 60,
    journeyDay: 5,
    completedActivityIds: [],
    dateIso: "2026-06-16",
    childId: 42,
    isPremium: false,
    ...overrides,
  };
}

const TODDLER = lesson("ss-2-4-add-1", "2-4", "Addition");
const PRIMARY = lesson("ss-6-8-add-1", "6-8", "Addition");
const UPPER_PRIMARY = lesson("ss-8-10-add-1", "8-10", "Addition");
const ADVANCED = lesson("ss-10-12-add-1", "10-12", "Addition");

describe("lesson eligibility by age/class/study mode", () => {
  it("toddler child should receive Ages 2-4 lessons", () => {
    const profile = ctx({ childAge: 3, childClass: "Nursery", studyMode: "play" });
    assert.equal(minAgeBandIndex(profile), 0);
    assert.ok(validateLessonEligibility(profile, TODDLER));
    assert.ok(!validateLessonEligibility(profile, ADVANCED));
  });

  it("class 1-5 child should receive primary lessons, not toddler", () => {
    const profile = ctx({ childAge: 8, childClass: "3rd", studyMode: "basic" });
    assert.equal(minAgeBandIndex(profile), 1);
    assert.ok(validateLessonEligibility(profile, PRIMARY));
    assert.ok(validateLessonEligibility(profile, lesson("ss-4-6-add-1", "4-6")));
    assert.ok(!validateLessonEligibility(profile, TODDLER));
  });

  it("class 6-10 child should never receive preschool lessons", () => {
    const profile = ctx({ childAge: 12, childClass: "8th", studyMode: "advanced" });
    assert.equal(minAgeBandIndex(profile), 3);
    assert.ok(validateLessonEligibility(profile, UPPER_PRIMARY));
    assert.ok(validateLessonEligibility(profile, ADVANCED));
    assert.ok(!validateLessonEligibility(profile, TODDLER));
    assert.ok(!validateLessonEligibility(profile, lesson("ss-4-6-add-1", "4-6")));
  });

  it("advanced study mode must not return toddler lessons", () => {
    const profile = ctx({ childAge: 11, childClass: "6th", studyMode: "advanced" });
    const pool = [TODDLER, PRIMARY, UPPER_PRIMARY, ADVANCED];
    const eligible = filterEligibleSmartStudyLessons(pool, profile);
    assert.ok(!eligible.some((l) => l.ageBand === "2-4"));
    assert.ok(!eligible.some((l) => l.ageBand === "4-6"));
    assert.ok(eligible.some((l) => l.ageBand === "6-8"));
  });

  it("filterUnlockedCatalog excludes toddler lessons for advanced class 8 child", () => {
    const profile = ctx({
      childAge: 13,
      childClass: "8th",
      studyMode: "advanced",
      masteryScore: 90,
      isPremium: true,
    });
    const catalog = [
      lesson("ss-2-4-numbers-1", "2-4", "Numbers"),
      lesson("ss-2-4-addition-1", "2-4", "Addition"),
      lesson("ss-8-10-algebra-1", "8-10", "Logic"),
      lesson("ss-10-12-stats-1", "10-12", "Logic"),
    ];
    const unlocked = filterUnlockedCatalog("smart-study", catalog, profile);
    assert.ok(unlocked.every((l) => l.ageBand !== "2-4"));
    assert.ok(unlocked.some((l) => l.id === "ss-8-10-algebra-1"));
  });

  it("rejects Adding Small Groups toddler lesson for advanced study child", () => {
    const toddlerAddition = {
      ...TODDLER,
      id: "ss-2-4-addition-groups-1",
      title: "Adding Small Groups 1 (Ages 2-4)",
    };
    const profile = ctx({ childAge: 12, childClass: "7th", studyMode: "advanced" });
    assert.ok(!validateLessonEligibility(profile, toddlerAddition));
  });
});

describe("fresh lesson sequence with eligibility", () => {
  it("buildFreshLessonSequence never puts toddler first for advanced child", () => {
    const profile = ctx({ childAge: 12, childClass: "8th", studyMode: "advanced" });
    const catalog = [TODDLER, PRIMARY, UPPER_PRIMARY, ADVANCED];
    const unlocked = filterUnlockedCatalog("smart-study", catalog, profile);
    const sequence = buildFreshLessonSequence(unlocked, emptyLessonVisibility(), []);
    assert.ok(sequence.length > 0);
    assert.notEqual(sequence[0], TODDLER.id);

    const out = resolveFreshLessonOnLogin({
      state: emptyFreshLessonState(),
      sequence,
      nowMs: Date.parse("2026-06-16T10:00:00Z"),
    });
    assert.notEqual(out.lessonId, TODDLER.id);
  });

  it("discards stale sequence when stored lesson is no longer eligible", () => {
    const profile = ctx({ childAge: 12, childClass: "8th", studyMode: "advanced" });
    const catalog = [TODDLER, UPPER_PRIMARY, ADVANCED];
    const unlocked = filterUnlockedCatalog("smart-study", catalog, profile);
    const staleState = {
      currentFreshLessonId: TODDLER.id,
      currentFreshLessonAssignedAt: "2026-06-01T10:00:00Z",
      freshLessonSequence: [TODDLER.id, UPPER_PRIMARY.id],
    };
    assert.ok(!isFreshLessonStateValid(staleState, profile, catalog));

    const sequence = buildFreshLessonSequence(unlocked, emptyLessonVisibility(), []);
    const fallback = pickFirstEligibleLessonId(sequence, profile, unlocked);
    assert.ok(fallback);
    assert.notEqual(fallback, TODDLER.id);
  });

  it("returns null fallback when no eligible lessons exist", () => {
    const profile = ctx({ childAge: 12, childClass: "8th", studyMode: "advanced" });
    const onlyToddler = [TODDLER];
    const sequence = buildFreshLessonSequence(onlyToddler, emptyLessonVisibility(), []);
    const picked = pickFirstEligibleLessonId(sequence, profile, onlyToddler);
    assert.equal(picked, null);
  });
});
