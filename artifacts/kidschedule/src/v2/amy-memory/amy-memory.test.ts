import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { FrontDoorState } from "@/v2/front-door/state-machine";
import {
  clearGuestSession,
  ensureGuestSession,
  getGuestSession,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
} from "@/v2/guest";
import {
  claimGuestSessionOnAuth,
  clearSoftSaveForTests,
  readSoftSaveClaim,
} from "@/v2/guest/soft-save";
import {
  clearMissionCompletion,
  markMissionCompleted,
  readMissionCompletion,
} from "@/v2/today/mission/completion";
import {
  clearCoachDiscoveryForTests,
  consumeCoachDiscoverGoal,
  readPreparedCoachPlan,
  savePreparedCoachPlan,
  stashCoachDiscoverGoal,
} from "@/v2/coach-discovery/prepared-plan";
import {
  AMY_MEMORY_SCHEMA_VERSION,
  AMY_MEMORY_STORAGE_KEY,
  bindSignedInAmyMemory,
  clearAmyMemoryForTests,
  computeContextVersion,
  ensureAmyMemory,
  getAmyMemoryHealth,
  getAmyMemorySnapshot,
  mergeGuestIntoAccountMemory,
  readAmyMemory,
  updateAmyMemory,
} from "./index";
import {
  LEGACY_COACH_PREPARED_PLAN_KEY,
  LEGACY_GUEST_SESSION_KEY,
  LEGACY_MISSION_COMPLETION_KEY,
} from "./keys";

function enableGuestMode() {
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectTsFiles(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("Amy Memory infrastructure", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearGuestSession();
    clearMissionCompletion();
    clearCoachDiscoveryForTests();
    clearSoftSaveForTests();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("creates versioned guest memory with contextVersion and timestamps", () => {
    const mem = ensureAmyMemory();
    expect(mem.schemaVersion).toBe(AMY_MEMORY_SCHEMA_VERSION);
    expect(mem.schemaVersion).toBe(2);
    expect(mem.identity.mode).toBe("guest");
    expect(mem.identity.guestId).toBeTruthy();
    expect(mem.contextVersion).toMatch(/^ctx_v1_/);
    expect(mem.createdAt).toBeTruthy();
    expect(mem.updatedAt).toBeTruthy();
    expect(mem.child.meta.source).toBeTruthy();
    expect(mem.challenge.meta.version).toBeGreaterThanOrEqual(1);
    expect(Object.isFrozen(mem)).toBe(true);
    expect(Object.isFrozen(mem.child)).toBe(true);
  });

  it("rejects mutation of returned snapshot", () => {
    const mem = ensureAmyMemory();
    expect(() => {
      (mem as { updatedAt: string }).updatedAt = "nope";
    }).toThrow();
  });

  it("getAmyMemorySnapshot is readonly and matches readAmyMemory", () => {
    ensureAmyMemory();
    updateAmyMemory(
      { child: { displayName: "Snap" } },
      { source: "test" },
    );
    const snap = getAmyMemorySnapshot();
    expect(snap?.child.displayName).toBe("Snap");
    expect(Object.isFrozen(snap)).toBe(true);
    expect(snap).toEqual(readAmyMemory());
  });

  it("stamps section source / updatedAt / version on writes", () => {
    ensureAmyMemory();
    const before = readAmyMemory()!.child.meta.version;
    const next = updateAmyMemory(
      { child: { displayName: "MetaKid" } },
      { source: "test_writer", sectionSources: { child: "test_writer" } },
    );
    expect(next.child.meta.source).toBe("test_writer");
    expect(next.child.meta.updatedAt).toBeTruthy();
    expect(next.child.meta.version).toBe(before + 1);
  });

  it("bumps contextVersion only when meaningful facts change", () => {
    const a = ensureAmyMemory();
    const b = updateAmyMemory({
      activity: { recentSummary: a.activity.recentSummary },
    });
    expect(b.contextVersion).toBe(a.contextVersion);

    const c = updateAmyMemory(
      { child: { displayName: "Riya" } },
      { source: "test" },
    );
    expect(c.contextVersion).not.toBe(a.contextVersion);
    expect(c.child.displayName).toBe("Riya");
  });

  it("guest session bridge reads/writes through Memory SoT", () => {
    enableGuestMode();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestChildName("Asha");
    setGuestWorry("behavior");

    const session = getGuestSession();
    expect(session?.name).toBe("Asha");
    expect(session?.worry).toBe("behavior");

    const mem = readAmyMemory();
    expect(mem?.child.displayName).toBe("Asha");
    expect(mem?.child.meta.source).toBe("guest_bridge");
    expect(mem?.challenge.worryId).toBe("behavior");
    expect(mem?.frontDoor.state).toBe(FrontDoorState.COMPLETE);
    expect(localStorage.getItem(LEGACY_GUEST_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(AMY_MEMORY_STORAGE_KEY)).toBeTruthy();
  });

  it("mission + coach + speech facts live in one document", () => {
    enableGuestMode();
    const session = ensureGuestSession()!;
    markMissionCompleted({
      guestId: session.guestId,
      missionId: "speech_name_three",
    });
    savePreparedCoachPlan({
      goalId: "toddler-tantrums",
      goalTitle: "Toddler Tantrums",
      categoryId: "toddler-behavior",
      worryId: "behavior",
      challengeLabel: "Behaviour & tantrums",
    });
    stashCoachDiscoverGoal("toddler-tantrums");

    const mem = readAmyMemory()!;
    expect(mem.mission.missionId).toBe("speech_name_three");
    expect(mem.mission.meta.source).toBe("mission_bridge");
    expect(mem.speech.todayMissionStatus).toBe("completed");
    expect(mem.speech.meta.source).toBe("mission_bridge");
    expect(mem.coach.status).toBe("prepared");
    expect(mem.coach.meta.source).toBe("coach_bridge");
    expect(mem.coach.prepared?.goalId).toBe("toddler-tantrums");
    expect(mem.coach.discoverGoalId).toBe("toddler-tantrums");
    expect(readMissionCompletion()?.missionId).toBe("speech_name_three");
    expect(readPreparedCoachPlan()?.goalId).toBe("toddler-tantrums");
    expect(consumeCoachDiscoverGoal()).toBe("toddler-tantrums");
    expect(readAmyMemory()?.coach.discoverGoalId).toBeNull();
  });

  it("migrates legacy localStorage keys into Amy Memory once", () => {
    localStorage.setItem(
      LEGACY_GUEST_SESSION_KEY,
      JSON.stringify({
        version: 1,
        guestId: "legacy-guest",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ageBand: "child_6_8",
        name: "Legacy",
        worry: "sleep",
        state: "COMPLETE",
      }),
    );
    localStorage.setItem(
      LEGACY_MISSION_COMPLETION_KEY,
      JSON.stringify({
        guestId: "legacy-guest",
        missionId: "m1",
        dateKey: "2026-01-01",
        completedAt: "2026-01-01T12:00:00.000Z",
      }),
    );
    localStorage.setItem(
      LEGACY_COACH_PREPARED_PLAN_KEY,
      JSON.stringify({
        goalId: "improve-sleep-patterns",
        goalTitle: "Improve Sleep Patterns",
        categoryId: "sleep",
        worryId: "sleep",
        challengeLabel: "Sleep",
        preparedAt: "2026-01-01T12:00:00.000Z",
        gateDismissed: true,
      }),
    );

    const mem = readAmyMemory()!;
    expect(mem.migrationApplied).toBe(true);
    expect(mem.identity.guestId).toBe("legacy-guest");
    expect(mem.child.displayName).toBe("Legacy");
    expect(mem.challenge.worryId).toBe("sleep");
    expect(mem.mission.missionId).toBe("m1");
    expect(mem.coach.prepared?.goalId).toBe("improve-sleep-patterns");
    expect(localStorage.getItem(LEGACY_GUEST_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_MISSION_COMPLETION_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_COACH_PREPARED_PLAN_KEY)).toBeNull();

    const health = getAmyMemoryHealth();
    expect(health.migrationApplied).toBe(true);
    expect(health.schemaVersion).toBe(2);
    expect(health.legacyKeysRemaining).toEqual([]);
    expect(health.lastUpdated).toBeTruthy();
  });

  it("persists merge audit metadata", () => {
    enableGuestMode();
    ensureGuestSession();
    setGuestChildName("Kabir");
    setGuestAgeBand("toddler_1_2");
    setGuestWorry("behavior");
    claimGuestSessionOnAuth();

    const claim = readSoftSaveClaim();
    expect(claim?.name).toBe("Kabir");
    expect(readAmyMemory()?.merge).toMatchObject({
      guestId: expect.any(String),
      mergeReason: "soft_save_claim",
      mergeVersion: 1,
    });

    const merged = mergeGuestIntoAccountMemory({
      userId: "user-1",
      childId: "child-9",
      mergeReason: "guest_to_account",
    });
    expect(merged.identity.mode).toBe("signed_in");
    expect(merged.identity.userId).toBe("user-1");
    expect(merged.child.childId).toBe("child-9");
    expect(merged.child.displayName).toBe("Kabir");
    expect(merged.merge).toMatchObject({
      guestId: expect.any(String),
      accountId: "user-1",
      mergeReason: "guest_to_account",
      mergeVersion: 2,
      lastMergedAt: expect.any(String),
    });

    const bound = bindSignedInAmyMemory({ userId: "user-1", childId: "child-9" });
    expect(bound.identity.mode).toBe("signed_in");
    expect(bound.merge.accountId).toBe("user-1");
  });

  it("computeContextVersion is stable for identical facts", () => {
    const mem = ensureAmyMemory();
    expect(computeContextVersion(mem)).toBe(mem.contextVersion);
  });

  it("enforces write ownership — adapters do not call localStorage.setItem", () => {
    const roots = [
      join(process.cwd(), "src/v2/guest"),
      join(process.cwd(), "src/v2/today/mission"),
      join(process.cwd(), "src/v2/coach-discovery"),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of collectTsFiles(root)) {
        if (file.includes("/amy-memory/")) continue;
        const src = readFileSync(file, "utf8");
        if (src.includes("localStorage.setItem")) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
