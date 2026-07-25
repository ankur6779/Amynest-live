import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetReplyMemoryForTests,
  loadReplyMemory,
  polishDisplayedReply,
  rememberGreeting,
  rememberPlanetsDiscussed,
  responseLengthHint,
} from "./reply-memory";

describe("reply-memory anti-repetition", () => {
  beforeEach(() => {
    __resetReplyMemoryForTests();
  });

  it("rewrites a repeated opening before display", () => {
    const profileId = "p1";
    const first = polishDisplayedReply(
      profileId,
      "Looking at their chart, curiosity often softens first. Notice the quiet pauses.",
    );
    expect(first.startsWith("Looking at their chart")).toBe(true);

    const second = polishDisplayedReply(
      profileId,
      "Looking at their chart, belonging shows up in small rituals. Keep evenings gentle.",
    );
    expect(second.startsWith("Looking at their chart")).toBe(false);
    expect(second.length).toBeGreaterThan(20);

    const mem = loadReplyMemory(profileId);
    expect(mem.lastOpenings.length).toBeGreaterThanOrEqual(1);
  });

  it("tracks greetings and planets without inventing extras", () => {
    rememberGreeting("p2", "Good morning, Ada.");
    rememberGreeting("p2", "Welcome back, Ada.");
    rememberPlanetsDiscussed("p2", ["Sun", "Moon"]);
    const mem = loadReplyMemory("p2");
    expect(mem.lastGreetings[0]).toBe("Welcome back, Ada.");
    expect(mem.lastPlanets).toEqual(["Sun", "Moon"]);
  });

  it("picks smart response length hints", () => {
    expect(responseLengthHint("hi", true)).toBe("short");
    expect(responseLengthHint("Explain everything about their Moon chapter in detail", false)).toBe(
      "long",
    );
    expect(responseLengthHint("How can I support bedtime?", true)).toBe("medium");
  });
});
