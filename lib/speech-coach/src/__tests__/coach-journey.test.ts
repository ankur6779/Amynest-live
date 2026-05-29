import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildCoachLearningJourney,
  classifySoundCategory,
  mergeCoachJourneySnapshot,
} from "../coach-journey";
import { buildCoachSessionMemory } from "../coach-memory";
import { buildJourneyWelcomeLines, createCoachDialogueContext } from "../coach-dialogue";

describe("coach-journey sound classification", () => {
  it("classifies vowels, blends, and digraphs", () => {
    assert.equal(classifySoundCategory("ah", "phonic"), "vowel");
    assert.equal(classifySoundCategory("bl", "phonic"), "blend");
    assert.equal(classifySoundCategory("sh", "phonic"), "digraph");
  });
});

describe("coach-journey learning profile", () => {
  it("tracks mastered and struggling sounds from prompt history", () => {
    const journey = buildCoachLearningJourney([], {
      childId: 1,
      lastSessionDate: "2026-05-28",
      lastSessionScore: 30,
      lastSessionBestStreak: 2,
      longestStreakEver: 2,
      lastSessionItemsCompleted: 6,
      totalSessions: 3,
      promptHistory: {
        P_sh: { promptId: "P_sh", promptText: "sh", bestScore: 90, attempts: 3, lastPracticed: "2026-05-28", kind: "phonic" },
        P_th: { promptId: "P_th", promptText: "th", bestScore: 42, attempts: 4, lastPracticed: "2026-05-27", kind: "phonic" },
      },
      recentlyMasteredPromptIds: ["P_sh"],
    });

    assert.equal(journey.masteredSounds.length, 1);
    assert.equal(journey.strugglingSounds.length, 1);
    assert.equal(journey.recentlyMastered[0]?.promptText, "sh");
  });

  it("merges session attempts and unlocks achievements", () => {
    const snapshot = mergeCoachJourneySnapshot(null, {
      childId: 1,
      score: 50,
      bestStreak: 4,
      itemsCompleted: 6,
      activity: "live",
      perfectSession: true,
      attempts: [
        { promptId: "W_cat", promptText: "cat", kind: "word", score: 88 },
        { promptId: "P_bl", promptText: "bl", kind: "phonic", score: 78 },
      ],
    });

    assert.ok(snapshot.achievements?.includes("first_word_spoken"));
    assert.ok(snapshot.achievements?.includes("first_perfect_session"));
    assert.equal(snapshot.promptHistory?.W_cat?.bestScore, 88);
  });
});

describe("coach-journey dialogue", () => {
  it("opens with sound-focused journey memory", () => {
    const memory = buildCoachSessionMemory(
      {
        promptsAttempted: 20,
        promptsClear: 14,
        pronunciationPct: 70,
        streakDays: 2,
        daysActive: 2,
        dailyTrend: [],
        weakSounds: [{ promptId: "P_th", promptText: "th", avgScore: 48, attempts: 5 }],
      },
      {
        childId: 1,
        lastSessionDate: "2026-05-27",
        lastSessionScore: 30,
        lastSessionBestStreak: 3,
        longestStreakEver: 3,
        lastSessionItemsCompleted: 6,
        totalSessions: 5,
        promptHistory: {
          P_sh: { promptId: "P_sh", promptText: "sh", bestScore: 92, attempts: 4, lastPracticed: "2026-05-27", kind: "phonic" },
        },
        recentlyMasteredPromptIds: ["P_sh"],
        lastSessionStruggled: true,
      },
    );

    const ctx = createCoachDialogueContext({
      childName: "Aarav",
      ageMonths: 60,
      promptKind: "word",
      sessionIndex: 0,
      sessionTotal: 6,
      streak: 0,
      sessionSeed: 12345,
      turnIndex: 0,
      memory,
    });

    const lines = buildJourneyWelcomeLines(ctx);
    assert.ok(lines.length >= 1);
    assert.ok(lines.some((l) => /sh|mastered|worked hard|tricky|progress/i.test(l)));
  });
});
