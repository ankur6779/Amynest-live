import { describe, expect, it } from "vitest";
import {
  NEW_CHAT_TITLE,
  groupConversationsByDay,
  titleFromFirstUserMessage,
} from "./conversation-title";

describe("conversation-title", () => {
  it("uses New chat for empty input", () => {
    expect(titleFromFirstUserMessage("   ")).toBe(NEW_CHAT_TITLE);
  });

  it("uses the first sentence, never New Chat 1", () => {
    expect(titleFromFirstUserMessage("John is refusing to sleep lately")).toBe(
      "John is refusing to sleep lately",
    );
    expect(titleFromFirstUserMessage("Bedtime routine")).toBe("Bedtime routine");
    expect(titleFromFirstUserMessage("Hello. More later.")).toBe("Hello");
    expect(titleFromFirstUserMessage("x".repeat(80))).toMatch(/…$/);
    expect(titleFromFirstUserMessage("Bedtime routine")).not.toMatch(/New Chat \d/i);
  });

  it("groups by today / yesterday / older", () => {
    const now = Date.parse("2026-08-16T15:00:00");
    const groups = groupConversationsByDay(
      [
        { updatedAt: new Date(now - 60_000).toISOString(), id: "a" },
        { updatedAt: new Date(now - 26 * 3_600_000).toISOString(), id: "b" },
        { updatedAt: new Date(now - 10 * 86_400_000).toISOString(), id: "c" },
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Older"]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["a"]);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(["b"]);
    expect(groups[2]?.items.map((i) => i.id)).toEqual(["c"]);
  });
});
