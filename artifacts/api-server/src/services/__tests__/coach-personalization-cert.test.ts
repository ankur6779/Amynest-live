import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??=
  "postgresql://localhost:5432/amynest_test?connect_timeout=1";

const {
  buildGoalSpecificInitialFallback,
  certificationReport,
} = await import("../coachGoalFallbackLibrary.js");

const {
  isDuplicateTitle,
  isWinTooSimilar,
  buildFeedbackPromptBlock,
} = await import("../coachWinAntiRepetition.js");

describe("coach personalization certification", () => {
  it("night-time dry and manage overwhelm produce different first wins", () => {
    const input = { ageGroup: "2-4", severity: "moderate", routine: "Inconsistent" };
    const nightDry = buildGoalSpecificInitialFallback(
      "potty-night-training",
      "Night-Time Dry",
      { ...input, goal: "potty-night-training" },
    );
    const overwhelm = buildGoalSpecificInitialFallback(
      "manage-overwhelm",
      "Manage Daily Overwhelm",
      { ...input, goal: "manage-overwhelm", ageGroup: "Adult (parent self-care)" },
    );

    assert.notEqual(nightDry.wins[0]!.title, overwhelm.wins[0]!.title);
    assert.notEqual(nightDry.wins[0]!.actions.join("|"), overwhelm.wins[0]!.actions.join("|"));
    assert.notEqual(nightDry.root_cause, overwhelm.root_cause);
    assert.match(nightDry.wins[0]!.title, /track|morning|wet|dry/i);
    assert.match(overwhelm.wins[0]!.title, /pause|react|overwhelm/i);
  });

  it("first 10 wins per goal have no duplicate titles within a goal", () => {
    const goals = [
      { id: "potty-night-training", label: "Night-Time Dry" },
      { id: "manage-overwhelm", label: "Manage Daily Overwhelm" },
      { id: "manage-tantrums", label: "Manage Tantrums" },
      { id: "fix-bedtime-resistance", label: "Fix Bedtime Resistance" },
    ];
    const report = certificationReport(goals);
    for (const row of report) {
      assert.equal(row.duplicateTitles.length, 0, `${row.label} had duplicate titles: ${row.duplicateTitles.join(", ")}`);
    }
  });

  it("different goals do not share identical first-win titles", () => {
    const goals = [
      { id: "potty-night-training", label: "Night-Time Dry" },
      { id: "manage-overwhelm", label: "Manage Daily Overwhelm" },
      { id: "balance-screen-time", label: "Balance Screen Time" },
      { id: "navigate-fussy-eating", label: "Navigate Fussy Eating" },
    ];
    const report = certificationReport(goals);
    const firstTitles = report.map((r) => r.firstTenTitles[0]!);
    const unique = new Set(firstTitles);
    assert.equal(unique.size, firstTitles.length);
  });

  it("anti-repetition detects duplicate titles and actions", () => {
    assert.equal(isDuplicateTitle("Pause and name what you see", ["Pause and name what you see"]), true);
    assert.equal(
      isWinTooSimilar(
        {
          title: "Pause and name what you see",
          actions: ["Stop talking for 3 breaths", "Say one feeling word", "Ask one short question"],
        },
        [{
          title: "Pause and name what you see",
          actions: ["Stop talking for 3 breaths", "Say one feeling word", "Ask one short question"],
        }],
      ),
      true,
    );
  });

  it("feedback prompt block adapts for worked, partial, and not worked", () => {
    const worked = buildFeedbackPromptBlock([{ winNumber: 1, title: "Track mornings", feedback: "yes" }]);
    const partial = buildFeedbackPromptBlock([{ winNumber: 2, title: "Bedtime habit", feedback: "somewhat" }]);
    const failed = buildFeedbackPromptBlock([{ winNumber: 3, title: "Fluid shift", feedback: "no" }]);

    assert.match(worked, /WORKED/i);
    assert.match(partial, /PARTIALLY WORKED/i);
    assert.match(failed, /NOT WORKED/i);
  });
});
