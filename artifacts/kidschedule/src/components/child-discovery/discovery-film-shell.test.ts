import { describe, expect, it } from "vitest";
import { memoryForBeat, roomForBeat } from "./discovery-film-shell";

describe("Discovery film shell mapping", () => {
  it("maps beats to existing FE rooms without inventing new rooms", () => {
    expect(roomForBeat("arrival")).toBe("welcome");
    expect(roomForBeat("child-name")).toBe("discovery-name");
    expect(roomForBeat("child-age")).toBe("discovery-age");
    expect(roomForBeat("today-world")).toBe("discovery-today");
    expect(roomForBeat("focus")).toBe("working");
    expect(roomForBeat("done")).toBe("done");
  });

  it("reuses Welcome R1 photography assets only", () => {
    const shots = [
      "arrival",
      "child-name",
      "child-age",
      "today-world",
      "focus",
      "earned",
    ] as const;
    for (const beat of shots) {
      const m = memoryForBeat(beat);
      expect(m.src.startsWith("/experience/r1/")).toBe(true);
    }
  });
});
