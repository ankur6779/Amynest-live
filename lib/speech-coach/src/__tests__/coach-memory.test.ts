import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildCoachSessionMemory,
  countConsecutivePracticeDays,
  deriveCoachMemoryTone,
  formatSoundForSpeech,
} from "../coach-memory";
import {
  buildMemoryWelcomeLines,
  buildSessionClosing,
  createCoachDialogueContext,
} from "../coach-dialogue";

describe("coach-memory tone", () => {
  it("uses supportive tone for low pronunciation success", () => {
    assert.equal(deriveCoachMemoryTone(40, 10, [{ avgScore: 42 }]), "supportive");
  });

  it("uses challenging tone for strong history", () => {
    assert.equal(deriveCoachMemoryTone(88, 20, [{ avgScore: 75 }]), "challenging");
  });

  it("uses balanced tone in the middle", () => {
    assert.equal(deriveCoachMemoryTone(65, 10, [{ avgScore: 58 }]), "balanced");
  });
});

describe("coach-memory consecutive days", () => {
  it("counts consecutive practice days ending at the latest active day", () => {
    const streak = countConsecutivePracticeDays([
      { date: "2026-05-25", attempts: 2, clearCount: 1, avgScore: 70 },
      { date: "2026-05-26", attempts: 1, clearCount: 1, avgScore: 80 },
      { date: "2026-05-27", attempts: 3, clearCount: 2, avgScore: 75 },
    ]);
    assert.equal(streak, 3);
  });
});

describe("coach-memory welcome lines", () => {
  const memory = buildCoachSessionMemory(
    {
      promptsAttempted: 24,
      promptsClear: 18,
      pronunciationPct: 75,
      streakDays: 3,
      daysActive: 3,
      dailyTrend: [
        { date: "2026-05-25", attempts: 2, clearCount: 1, avgScore: 70 },
        { date: "2026-05-26", attempts: 1, clearCount: 1, avgScore: 80 },
        { date: "2026-05-27", attempts: 3, clearCount: 2, avgScore: 75 },
      ],
      weakSounds: [{ promptId: "sh1", promptText: "sh", avgScore: 52, attempts: 4 }],
    },
    {
      childId: 1,
      lastSessionDate: "2026-05-26",
      lastSessionScore: 40,
      lastSessionBestStreak: 5,
      longestStreakEver: 5,
      lastSessionItemsCompleted: 6,
      totalSessions: 4,
    },
  );

  it("welcomes returning learners by name", () => {
    const ctx = createCoachDialogueContext({
      childName: "Aarav",
      ageMonths: 60,
      promptKind: "word",
      sessionIndex: 0,
      sessionTotal: 6,
      streak: 0,
      sessionSeed: 9001,
      turnIndex: 0,
      memory,
    });
    const lines = buildMemoryWelcomeLines(ctx);
    assert.ok(lines.some((l) => /welcome back|hello again|good to see you/i.test(l)));
    assert.ok(lines.some((l) => l.includes("Aarav")));
  });

  it("closes with growth language for returning learners", () => {
    const ctx = createCoachDialogueContext({
      childName: "Aarav",
      ageMonths: 60,
      promptKind: "word",
      sessionIndex: 5,
      sessionTotal: 6,
      streak: 2,
      sessionSeed: 9001,
      turnIndex: 6,
      memory,
    });
    const closing = buildSessionClosing(ctx, 55, 4);
    assert.ok(closing.some((l) => /clearer|confident|stronger|again|tomorrow/i.test(l)));
    assert.ok(!closing.some((l) => /beat your previous score/i.test(l)));
  });
});

describe("formatSoundForSpeech", () => {
  it("formats short phonemes naturally", () => {
    assert.equal(formatSoundForSpeech("sh"), "sh sound");
  });
});
