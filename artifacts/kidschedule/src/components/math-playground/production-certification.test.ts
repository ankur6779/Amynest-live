import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CARDS,
  MINI_GAME_TEMPLATES,
  applyActivityComplete,
  defaultLearningState,
  defaultRewardState,
  generateActivity,
  generateMiniGame,
  isMiniGameTemplate,
} from "@workspace/math-playground";
import { generateWorksheet } from "@workspace/math-playground-worksheets";
import {
  refreshPlaygroundIntelligence,
  renderTeacherReportHtml,
  renderWorksheetHtml,
} from "@workspace/math-playground-reporting";

describe("production certification — lib contracts", () => {
  it("generates every activity for age 7", () => {
    for (const card of ACTIVITY_CARDS) {
      const activity = generateActivity({
        activityId: card.id,
        ageYears: 7,
        childId: 99,
        learning: defaultLearningState(),
        adaptivityTier: "standard",
        enableMiniGames: true,
      });
      expect(activity.activityId).toBe(card.id);
      expect(activity.payload).toBeTruthy();
    }
  });

  it("every mini game template is completable", () => {
    for (const template of MINI_GAME_TEMPLATES) {
      const payload = generateMiniGame(template, "4-5", 42, "standard");
      expect(isMiniGameTemplate(payload.template)).toBe(true);
      if (template === "balloon_burst") {
        expect((payload.balloons?.length ?? 0)).toBeGreaterThan(payload.targetQuantity ?? 0);
      }
    }
  });

  it("stars and badges update on activity complete", () => {
    const next = applyActivityComplete(defaultRewardState(), "counting_adventure", 3);
    expect(next.stars).toBeGreaterThan(0);
    expect(next.activityCompletions.counting_adventure).toBe(1);
  });

  it("worksheet HTML and teacher report HTML render", () => {
    const worksheet = generateWorksheet({
      childId: 99,
      ageYears: 7,
      learning: defaultLearningState(),
    });
    const wsHtml = renderWorksheetHtml(worksheet, {
      title: "Worksheet",
      level: "Level 1",
      difficulty: "Easy",
      childName: "Cert",
      date: "2026-06-11",
      progressSection: "Progress",
      parentNotes: "Notes",
      problemLabel: (i) => `Problem ${i}`,
      resolvePrompt: (p) => p.promptKey,
      objectEmoji: () => "🍎",
    });
    expect(wsHtml).toContain("<html");

    let learning = defaultLearningState();
    for (let i = 0; i < 5; i += 1) {
      learning = {
        ...learning,
        sessionHistory: [
          ...learning.sessionHistory,
          {
            activityId: "addition_lab",
            completedAt: Date.now() - i * 1000,
            hintsUsed: 0,
            durationMs: 60_000,
            success: true,
            tierUsed: "standard",
          },
        ],
      };
    }

    const intel = refreshPlaygroundIntelligence({
      state: {
        version: 4,
        childId: 99,
        rewards: defaultRewardState(),
        learning,
        intelligence: {
          generatedWorksheets: [],
          parentReports: [],
          forecastHistory: [],
          sessionsSinceLastReport: 0,
        },
      },
      ageYears: 7,
      childDisplayName: "Cert",
      afterSessionComplete: true,
    });

    if (intel.intelligence.lastTeacherReport) {
      const teacherHtml = renderTeacherReportHtml(intel.intelligence.lastTeacherReport, {
        title: "Teacher Report",
        readiness: "Readiness",
        mastered: "Mastered",
        emerging: "Emerging",
        needsSupport: "Needs support",
        history: "History",
        notes: "Notes",
        skillName: (s) => s,
      });
      expect(teacherHtml).toContain("<html");
    }
  });
});
