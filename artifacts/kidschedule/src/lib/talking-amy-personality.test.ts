import { describe, expect, it } from "vitest";
import { pickContextualTalkingAmyReaction } from "./talking-amy-personality";
import { getTalkingAmyMode } from "./talking-amy-modes";

describe("talking-amy-personality", () => {
  const mode = getTalkingAmyMode("chipmunk");

  it("reacts to achievement unlock", () => {
    const line = pickContextualTalkingAmyReaction(mode, 2000, {
      achievement: {
        id: "echo_explorer",
        kind: "repeat",
        threshold: 10,
        title: "Echo Explorer",
        emoji: "🔁",
        description: "test",
      },
    });
    expect(line).toContain("badge");
  });

  it("greets on first use today", () => {
    const line = pickContextualTalkingAmyReaction(mode, 2000, {
      isFirstUseToday: true,
      streakDay: 1,
    });
    expect(line).toMatch(/Hi friend|missed you/i);
  });

  it("celebrates five repeats in a row", () => {
    const line = pickContextualTalkingAmyReaction(mode, 2000, {
      consecutiveRepeats: 5,
    });
    expect(line).toContain("having fun");
  });
});
