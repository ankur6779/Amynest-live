import { describe, it, expect } from "vitest";
import {
  canTransitionIntent,
  buildContinueJourneyView,
  smartReminderBody,
} from "@workspace/intent-recovery";

describe("intent-recovery client", () => {
  it("blocks invalid state transitions", () => {
    expect(canTransitionIntent("completed", "started")).toBe(false);
    expect(canTransitionIntent("pending", "started")).toBe(true);
  });

  it("builds continue journey view", () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString();
    const view = buildContinueJourneyView([
      {
        intentId: "i1",
        userId: "u1",
        childId: 1,
        intentType: "FINISH_ROUTINE_ITEM",
        intentSource: "routine",
        intentPriority: 90,
        state: "pending",
        title: "Brush teeth",
        subtitle: "Morning routine",
        amyContinuationLine: "Continue routine",
        actionTarget: "routine_task",
        entityId: "5",
        href: "/routines/5",
        progressPct: 40,
        progressJson: {},
        deviceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        interruptedAt: null,
        completedAt: null,
        expiresAt: expires,
      },
    ]);
    expect(view.hasUnfinished).toBe(true);
    expect(view.topIntent?.title).toBe("Brush teeth");
  });

  it("generates smart reminder for reading challenge", () => {
    const text = smartReminderBody({
      intentType: "START_READING_CHALLENGE",
      title: "Day 4",
      subtitle: "",
    } as Parameters<typeof smartReminderBody>[0]);
    expect(text).toContain("reading challenge");
  });
});
