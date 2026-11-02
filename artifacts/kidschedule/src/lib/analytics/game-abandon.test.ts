import { describe, expect, it } from "vitest";
import { claimGameAbandon, type GamePlaySession } from "./game-abandon";

function session(overrides: Partial<GamePlaySession> = {}): GamePlaySession {
  return {
    gameId: "memory-match",
    idempotencyKey: "play-1",
    finished: false,
    abandonEmitted: false,
    ...overrides,
  };
}

describe("game abandonment", () => {
  it("claims one abandon after a real start", () => {
    const play = session();
    expect(claimGameAbandon(play)).toEqual({ gameId: "memory-match" });
    expect(claimGameAbandon(play)).toBeNull();
  });

  it("does not abandon a game that never started", () => {
    expect(claimGameAbandon(null)).toBeNull();
  });

  it("does not abandon a completed game", () => {
    expect(claimGameAbandon(session({ finished: true }))).toBeNull();
  });

  it("does not abandon an empty game id", () => {
    expect(claimGameAbandon(session({ gameId: "   " }))).toBeNull();
  });
});
