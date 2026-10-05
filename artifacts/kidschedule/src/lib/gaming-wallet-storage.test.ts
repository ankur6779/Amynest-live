import { describe, it, expect, beforeEach } from "vitest";
import {
  POINTS_KEY,
  UNLOCKED_KEY,
  PLAY_LOG_KEY,
  SKILLS_KEY,
  LEDGER_KEY,
  WALLET_OWNER_KEY,
  applyWalletSnapshot,
  clearLocalGamingWallet,
  localWalletBelongsTo,
  readLocalWalletPartial,
  readWalletOwner,
  stampWalletOwner,
} from "@/lib/gaming-wallet-storage";
import { clearUserSessionCaches } from "@/lib/user-session-cache";

describe("gaming wallet account-switch isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clearLocalGamingWallet removes all sync-backed mirrors including owner", () => {
    localStorage.setItem(POINTS_KEY, "120");
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(["memory-match", "extra-game"]));
    localStorage.setItem(PLAY_LOG_KEY, JSON.stringify([{ id: "p1", date: "2026-10-01", pointsEarned: 5, perfect: false }]));
    localStorage.setItem(SKILLS_KEY, JSON.stringify({ memory: { attempts: 3, correct: 2, plays: 1 } }));
    localStorage.setItem(LEDGER_KEY, JSON.stringify([{ date: "2026-10-01", childName: "A", activity: "play", points: 5 }]));
    stampWalletOwner("uid-a");

    clearLocalGamingWallet();

    expect(localStorage.getItem(POINTS_KEY)).toBeNull();
    expect(localStorage.getItem(UNLOCKED_KEY)).toBeNull();
    expect(localStorage.getItem(PLAY_LOG_KEY)).toBeNull();
    expect(localStorage.getItem(SKILLS_KEY)).toBeNull();
    expect(localStorage.getItem(LEDGER_KEY)).toBeNull();
    expect(readWalletOwner()).toBeNull();
  });

  it("clearUserSessionCaches wipes gaming mirrors so account switch cannot POST them", () => {
    localStorage.setItem(POINTS_KEY, "90");
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(["memory-match", "puzzle", "bonus"]));
    localStorage.setItem(PLAY_LOG_KEY, JSON.stringify([{ id: "p1", date: "2026-10-01", pointsEarned: 5, perfect: true }]));
    localStorage.setItem(SKILLS_KEY, JSON.stringify({ logic: { attempts: 4, correct: 4, plays: 2 } }));
    localStorage.setItem(LEDGER_KEY, JSON.stringify([{ date: "2026-10-01", childName: "A", activity: "routine", points: 10 }]));
    stampWalletOwner("uid-a");

    clearUserSessionCaches();

    const local = readLocalWalletPartial();
    expect(local.pointsBalance).toBe(0);
    expect(local.unlockedGames).toEqual([]);
    expect(local.playLog).toEqual([]);
    expect(Object.values(local.skills).every((s) => s.attempts === 0 && s.correct === 0 && s.plays === 0)).toBe(true);
    expect(local.ledger).toEqual([]);
    expect(readWalletOwner()).toBeNull();
  });

  it("rejects foreign stamped owner and stale session uid leftovers", () => {
    stampWalletOwner("uid-a");
    expect(localWalletBelongsTo("uid-b")).toBe(false);
    expect(localWalletBelongsTo("uid-a")).toBe(true);

    clearLocalGamingWallet();
    localStorage.setItem(POINTS_KEY, "50");
    // No owner stamp yet, but session uid still points at prior account
    // (clearUserSessionCaches async race before Games hydrate).
    expect(localWalletBelongsTo("uid-b", "uid-a")).toBe(false);
    expect(localWalletBelongsTo("uid-a", "uid-a")).toBe(true);
    expect(localWalletBelongsTo("uid-b", null)).toBe(true);
  });

  it("applyWalletSnapshot stamps the signed-in owner", () => {
    applyWalletSnapshot(
      {
        pointsBalance: 10,
        unlockedGames: ["memory-match"],
        skills: {},
        playLog: [],
        ledger: [],
      },
      "uid-b",
    );
    expect(readWalletOwner()).toBe("uid-b");
    expect(localStorage.getItem(POINTS_KEY)).toBe("10");
  });
});
