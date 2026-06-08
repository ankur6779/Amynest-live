import { beforeEach, describe, expect, it } from "vitest";
import {
  loadTalkingAmyStats,
  recordTalkingAmyRepeat,
  recordTalkingAmyReplay,
  recordTalkingAmySessionStart,
  saveFavoriteTalkingAmyMode,
  loadFavoriteTalkingAmyMode,
} from "./talking-amy-session";

describe("talking-amy-session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("tracks session, repeat, and replay counts per child", () => {
    const childId = 42;
    expect(loadTalkingAmyStats(childId).repeatCount).toBe(0);

    const session = recordTalkingAmySessionStart(childId);
    expect(session.sessionCount).toBe(1);

    const repeat = recordTalkingAmyRepeat(childId);
    expect(repeat.repeatCount).toBe(1);

    const replay = recordTalkingAmyReplay(childId);
    expect(replay.replayCount).toBe(1);
    expect(loadTalkingAmyStats(childId).repeatCount).toBe(1);
  });

  it("persists favorite mode locally", () => {
    saveFavoriteTalkingAmyMode("monster");
    expect(loadFavoriteTalkingAmyMode()).toBe("monster");
  });
});
