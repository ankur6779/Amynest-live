import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assignFreshLesson,
} from "./fresh-lesson-state.js";
import {
  emptyLessonVisibility,
  mergeFreshLessonState,
  recordLessonViewed,
} from "./lesson-visibility.js";

describe("mergeFreshLessonState concurrency safety", () => {
  it("keeps newer fresh-lesson assignment when stale write races", () => {
    const advanced = assignFreshLesson(
      ["ss-a", "ss-b"],
      "ss-b",
      "2026-06-17T12:00:00.000Z",
    );
    let section = mergeFreshLessonState(
      {},
      emptyLessonVisibility(),
      assignFreshLesson(["ss-a", "ss-b"], "ss-a", "2026-06-16T12:00:00.000Z"),
    );

    section = mergeFreshLessonState(section, emptyLessonVisibility(), advanced);

    const staleView = recordLessonViewed(
      emptyLessonVisibility(),
      "ss-a",
      "2026-06-17T12:01:00.000Z",
    );
    const staleFresh = assignFreshLesson(
      ["ss-a", "ss-b"],
      "ss-a",
      "2026-06-16T12:00:00.000Z",
    );
    section = mergeFreshLessonState(section, staleView, staleFresh);

    const blob = (section as Record<string, unknown>).__contentBankLessons as Record<
      string,
      unknown
    >;
    assert.equal(blob.currentFreshLessonId, "ss-b");
    assert.equal(blob.currentFreshLessonAssignedAt, "2026-06-17T12:00:00.000Z");
    assert.equal((blob.viewed as Record<string, string>)["ss-a"], "2026-06-17T12:01:00.000Z");
  });
});
