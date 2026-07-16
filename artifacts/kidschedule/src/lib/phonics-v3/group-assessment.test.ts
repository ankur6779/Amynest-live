import { describe, expect, it } from "vitest";
import { defaultReadingSkillsState, recordSkillAttempt } from "./reading-skills";
import { buildGroupAssessment, scoreGroupAssessment } from "./group-assessment";

describe("group-assessment", () => {
  it("builds six assessment items for a SATPIN group", () => {
    const items = buildGroupAssessment(1, 2);
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.kind)).toEqual([
      "sound_id",
      "letter_id",
      "blend",
      "segment",
      "read_word",
      "listen",
    ]);
  });

  it("allows advance when score and skills are strong", () => {
    let skills = defaultReadingSkillsState();
    for (const s of [
      "letter_recognition",
      "beginning_sounds",
      "blending",
      "reading",
    ] as const) {
      for (let i = 0; i < 8; i++) skills = recordSkillAttempt(skills, s, true);
    }
    const items = buildGroupAssessment(1);
    const result = scoreGroupAssessment(
      1,
      items.map((i) => ({ id: i.id, kind: i.kind, correct: true })),
      skills,
    );
    expect(result.scorePct).toBe(100);
    expect(result.canAdvance).toBe(true);
  });
});
