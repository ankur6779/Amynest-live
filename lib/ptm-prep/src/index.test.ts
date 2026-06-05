import { describe, expect, it } from "vitest";
import {
  activeReminders,
  buildRemindersFromSession,
  createSession,
  formatPtmSummaryText,
  getQuestionsForAge,
  resolveAgeBand,
} from "./index";

describe("ptm-prep age packs", () => {
  it("resolves preschool band for young children", () => {
    expect(resolveAgeBand(4)).toBe("preschool");
    expect(getQuestionsForAge(4).length).toBeGreaterThan(0);
  });

  it("resolves primary band for 6–8", () => {
    expect(resolveAgeBand(7)).toBe("primary");
  });

  it("creates age-appropriate sessions", () => {
    const s = createSession({ childAge: 4, childName: "Ayaan" });
    expect(s.questions.some((q) => q.selected)).toBe(true);
    expect(s.childName).toBe("Ayaan");
  });
});

describe("ptm-prep reminders and share", () => {
  it("builds reminders for open actions", () => {
    const s = createSession();
    s.actions = [{ id: "a1", text: "Daily reading", done: false }];
    s.completedAt = Date.now();
    const reminders = buildRemindersFromSession(s);
    expect(reminders.length).toBeGreaterThan(0);
  });

  it("formats a shareable summary", () => {
    const s = createSession({ childName: "Riya" });
    s.teacherName = "Mrs. Shah";
    s.notes.teacherFeedback = "Doing well in maths.";
    const text = formatPtmSummaryText(s);
    expect(text).toContain("Riya");
    expect(text).toContain("Mrs. Shah");
    expect(text).toContain("maths");
  });

  it("filters active reminders by due date", () => {
    const due = activeReminders(
      [
        {
          id: "r1",
          sessionId: "s1",
          actionText: "Practice handwriting",
          dueDate: "2020-01-01",
        },
      ],
      "2026-06-05",
    );
    expect(due).toHaveLength(1);
  });
});
