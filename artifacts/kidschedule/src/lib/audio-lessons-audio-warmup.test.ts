import { describe, expect, it, beforeEach } from "vitest";
import {
  _resetAudioLessonsWarmupForTests,
  collectAudioLessonsWarmTargets,
  paragraphIndicesToWarm,
} from "@/lib/audio-lessons-audio-warmup";
import { getLessonById } from "@/lib/audio-lessons";

describe("audio-lessons-audio-warmup", () => {
  beforeEach(() => {
    _resetAudioLessonsWarmupForTests();
  });

  it("paragraphIndicesToWarm includes resume point and next paragraphs", () => {
    expect(paragraphIndicesToWarm(10, 3, 4)).toEqual([0, 3, 4, 5]);
  });

  it("collectAudioLessonsWarmTargets prioritizes resume then cards", () => {
    const resumeLesson = getLessonById("infant-sleep-foundations");
    expect(resumeLesson).toBeTruthy();

    const targets = collectAudioLessonsWarmTargets({
      lang: "en",
      amyHome: {
        quickPlay: { lessonId: "toddler-tantrums-101", action: "start", reason: "test" },
        dailyPick: { lessonId: "toddler-no-phase", reason: "daily", dateKey: "2026-06-01" },
      },
      resumeTarget: resumeLesson
        ? { lesson: resumeLesson, paragraphIdx: 2 }
        : null,
      ageRecommendationIds: ["toddler-potty-readiness"],
    });

    expect(targets.length).toBe(3);
    expect(targets[0]?.lesson.id).toBe("infant-sleep-foundations");
    expect(targets[0]?.paragraphIdx).toBe(2);
  });
});
