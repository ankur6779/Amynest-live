import { describe, it, expect, beforeEach } from "vitest";
import {
  clearUserSessionCaches,
  persistStoredSessionUid,
  readStoredSessionUid,
} from "@/lib/user-session-cache";
import { readOnboardingCache } from "@/lib/setup-status";
import { readCachedChildrenList } from "@/lib/dashboard-data-cache";

describe("clearUserSessionCaches", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears onboarding and dashboard children cache after account reset", () => {
    localStorage.setItem("onboardingComplete", "true");
    localStorage.setItem("amynest:dashboard:children:v1", JSON.stringify([{ id: 1, name: "A", age: 5 }]));
    localStorage.setItem("amynest:hub:activeChildId", "1");

    clearUserSessionCaches();

    expect(readOnboardingCache().onboardingComplete).toBe(false);
    expect(readCachedChildrenList()).toBeUndefined();
    expect(localStorage.getItem("amynest:hub:activeChildId")).toBeNull();
  });

  it("tracks session uid across logins on the same device", () => {
    persistStoredSessionUid("uid-a");
    expect(readStoredSessionUid()).toBe("uid-a");
    persistStoredSessionUid("uid-b");
    expect(readStoredSessionUid()).toBe("uid-b");
    clearUserSessionCaches();
    expect(readStoredSessionUid()).toBeNull();
  });

  it("does not delete the installation device id", () => {
    localStorage.setItem("amynest:device:id:v1", "install-device-keep");
    clearUserSessionCaches();
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install-device-keep");
  });

  it("clears device-global gaming wallet and offline play queue on account switch", () => {
    localStorage.setItem("amynest_points", "420");
    localStorage.setItem("amynest_unlocked_games_v1", JSON.stringify(["maze-escape"]));
    localStorage.setItem(
      "amynest_game_play_log_v1",
      JSON.stringify([{ id: "p1", date: "2026-09-01", pointsEarned: 10, perfect: false }]),
    );
    localStorage.setItem(
      "amynest_skill_progress_v1",
      JSON.stringify({ memory: { attempts: 1, correct: 1, plays: 1 } }),
    );
    localStorage.setItem(
      "amynest_ledger",
      JSON.stringify([{ date: "2026-09-01", childName: "A", activity: "game", points: 10 }]),
    );
    localStorage.setItem(
      "amynest_game_play_sync_queue_v1",
      JSON.stringify([
        {
          gameId: "maze-escape",
          score: 5,
          total: 8,
          idempotencyKey: "play:maze-escape:prior-user",
          queuedAt: Date.now(),
          attempts: 0,
        },
      ]),
    );

    clearUserSessionCaches();

    expect(localStorage.getItem("amynest_points")).toBeNull();
    expect(localStorage.getItem("amynest_unlocked_games_v1")).toBeNull();
    expect(localStorage.getItem("amynest_game_play_log_v1")).toBeNull();
    expect(localStorage.getItem("amynest_skill_progress_v1")).toBeNull();
    expect(localStorage.getItem("amynest_ledger")).toBeNull();
    expect(localStorage.getItem("amynest_game_play_sync_queue_v1")).toBeNull();
  });
});
