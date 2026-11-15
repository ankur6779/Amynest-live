import { afterEach, describe, expect, it } from "vitest";
import {
  noteGameCompleted,
  noteGameStarted,
  resetGameAbandonmentForTests,
  scheduleGameAbandonment,
  takeGameAbandonment,
} from "./game-abandonment";

afterEach(() => {
  resetGameAbandonmentForTests();
});

describe("game abandonment", () => {
  it("does not abandon a game that never started or already completed", () => {
    expect(takeGameAbandonment("missing")).toBeNull();
    noteGameStarted({
      sessionKey: "done",
      gameId: "puzzle",
      surface: "games_hub",
      authState: "authenticated",
      childId: 4,
    });
    noteGameCompleted("done");
    expect(takeGameAbandonment("done")).toBeNull();
  });

  it("emits one abandonment for a started guest or authenticated session", () => {
    noteGameStarted({
      sessionKey: "guest-1",
      gameId: "balloon",
      surface: "mini_game",
      authState: "guest",
    });
    noteGameStarted({
      sessionKey: "guest-1",
      gameId: "balloon",
      surface: "mini_game",
      authState: "guest",
    });
    const guest = takeGameAbandonment("guest-1");
    expect(guest).toMatchObject({
      game_id: "balloon",
      surface: "mini_game",
      auth_state: "guest",
      session_key: "guest-1",
    });
    expect(guest && "child_ref" in guest).toBe(false);
    expect(takeGameAbandonment("guest-1")).toBeNull();

    noteGameStarted({
      sessionKey: "auth-1",
      gameId: "castle",
      surface: "games_hub",
      authState: "authenticated",
      childId: 9,
    });
    const authed = takeGameAbandonment("auth-1");
    expect(authed?.auth_state).toBe("authenticated");
    expect(authed?.child_ref).toMatch(/^[a-f0-9]{24}$/);
    expect(JSON.stringify(authed)).not.toContain("\"9\"");
  });

  it("cancels a cleanup timer when the same session starts again", async () => {
    noteGameStarted({
      sessionKey: "rerender",
      gameId: "train",
      surface: "mini_game",
      authState: "guest",
    });
    const seen: string[] = [];
    scheduleGameAbandonment("rerender", (event) => seen.push(event.session_key));
    noteGameStarted({
      sessionKey: "rerender",
      gameId: "train",
      surface: "mini_game",
      authState: "guest",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toEqual([]);
    expect(takeGameAbandonment("rerender")?.game_id).toBe("train");
  });
});