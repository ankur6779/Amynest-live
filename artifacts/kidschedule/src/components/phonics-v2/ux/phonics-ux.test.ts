import { describe, expect, it } from "vitest";
import { LESSON_STEP_AMY_CUES } from "./GuidedAmyCue";
import { READING_LESSON_STEPS } from "@/lib/phonics-v3/reading-lesson-engine";

describe("Phonics guided UX cues", () => {
  it("covers every reading lesson step with a short Amy cue", () => {
    for (const step of READING_LESSON_STEPS) {
      const cue = LESSON_STEP_AMY_CUES[step.id];
      expect(cue, `missing cue for ${step.id}`).toBeTruthy();
      expect(cue!.split(/\s+/).length).toBeLessThanOrEqual(10);
    }
  });
});
