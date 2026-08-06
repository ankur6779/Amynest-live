import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
  getGuestSession,
} from "@/v2/guest";
import {
  clearMissionCompletion,
  isMissionCompletedToday,
  localDateKey,
  markMissionCompleted,
  readMissionCompletion,
} from "./completion";
import {
  DEFAULT_MISSION_AGE_BAND,
  DEFAULT_MISSION_WORRY,
  getTodaySpeechMission,
  listSpeechMissionIds,
  missionLookupCellCount,
  resolveMissionAgeBand,
  resolveMissionWorry,
} from "./speech-mission";

describe("Today Speech mission — Age × Worry lookup", () => {
  it("always returns domain speech", () => {
    const m = getTodaySpeechMission({
      ageBand: "preschool_3_5",
      name: null,
      worry: "speech_talking",
    });
    expect(m.domain).toBe("speech");
    expect(m.steps.length).toBeGreaterThan(0);
    expect(m.ctaLabel).toBe("Start today's step");
  });

  it("is deterministic for the same age + worry", () => {
    const input = {
      ageBand: "toddler_1_2" as const,
      name: null,
      worry: "speech_talking" as const,
    };
    const a = getTodaySpeechMission(input);
    const b = getTodaySpeechMission(input);
    expect(a).toEqual(b);
    expect(a.missionId).toBe("speech_toddler_copy_words");
    expect(a.title).toBeTruthy();
    expect(a.duration).toBe("3 min");
    expect(a.difficulty).toBe("easy");
    expect(a.estimatedMinutes).toBe(3);
  });

  it("changes mission when worry changes (same age)", () => {
    const age = "preschool_3_5" as const;
    const speech = getTodaySpeechMission({
      ageBand: age,
      name: null,
      worry: "speech_talking",
    });
    const sleep = getTodaySpeechMission({
      ageBand: age,
      name: null,
      worry: "sleep",
    });
    expect(speech.missionId).not.toBe(sleep.missionId);
    expect(speech.worry).toBe("speech_talking");
    expect(sleep.worry).toBe("sleep");
  });

  it("changes mission when age changes (same worry)", () => {
    const a = getTodaySpeechMission({
      ageBand: "infant_0_12m",
      name: null,
      worry: "mornings",
    });
    const b = getTodaySpeechMission({
      ageBand: "older_9_plus",
      name: null,
      worry: "mornings",
    });
    expect(a.missionId).not.toBe(b.missionId);
    expect(a.estimatedMinutes).toBe(2);
    expect(b.estimatedMinutes).toBe(5);
  });

  it("covers full static table: 5 ages × 7 worries, unique ids", () => {
    expect(missionLookupCellCount()).toBe(35);
    const ids = listSpeechMissionIds();
    expect(ids).toHaveLength(35);
    expect(new Set(ids).size).toBe(35);
  });

  it("defaults missing age/worry to preschool + speech_talking", () => {
    expect(resolveMissionAgeBand(null)).toBe(DEFAULT_MISSION_AGE_BAND);
    expect(resolveMissionWorry(null)).toBe(DEFAULT_MISSION_WORRY);
    const m = getTodaySpeechMission({
      ageBand: null,
      name: null,
      worry: null,
    });
    expect(m.ageBand).toBe(DEFAULT_MISSION_AGE_BAND);
    expect(m.worry).toBe(DEFAULT_MISSION_WORRY);
    expect(m.missionId).toBe("speech_preschool_name_it");
  });

  it("every table row has missionId, title, duration, difficulty, estimatedMinutes", () => {
    for (const age of [
      "infant_0_12m",
      "toddler_1_2",
      "preschool_3_5",
      "child_6_8",
      "older_9_plus",
    ] as const) {
      for (const worry of [
        "speech_talking",
        "sleep",
        "behavior",
        "learning_school",
        "mornings",
        "feeding",
        "something_else",
      ] as const) {
        const m = getTodaySpeechMission({ ageBand: age, name: null, worry });
        expect(m.missionId.length).toBeGreaterThan(0);
        expect(m.title.length).toBeGreaterThan(0);
        expect(m.duration).toMatch(/min/);
        expect(["easy", "medium", "hard"]).toContain(m.difficulty);
        expect(m.estimatedMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("weaves name into title without changing missionId", () => {
    const plain = getTodaySpeechMission({
      ageBand: "child_6_8",
      name: null,
      worry: "learning_school",
    });
    const named = getTodaySpeechMission({
      ageBand: "child_6_8",
      name: "Riya",
      worry: "learning_school",
    });
    expect(named.missionId).toBe(plain.missionId);
    expect(named.title).toContain("Riya");
  });

  it("never picks a non-speech domain", () => {
    for (const age of [
      "infant_0_12m",
      "toddler_1_2",
      "preschool_3_5",
      "child_6_8",
      "older_9_plus",
    ] as const) {
      for (const worry of [
        "speech_talking",
        "sleep",
        "behavior",
        "learning_school",
        "mornings",
        "feeding",
        "something_else",
      ] as const) {
        expect(
          getTodaySpeechMission({ ageBand: age, name: null, worry }).domain,
        ).toBe("speech");
      }
    }
  });
});

describe("Mission completion + refresh", () => {
  afterEach(() => {
    clearMissionCompletion();
  });

  it("marks complete and survives re-read (refresh)", () => {
    markMissionCompleted({
      guestId: "guest-1",
      missionId: "speech_preschool_name_it",
      now: new Date("2026-08-01T10:00:00"),
    });
    expect(
      isMissionCompletedToday({
        guestId: "guest-1",
        missionId: "speech_preschool_name_it",
        now: new Date("2026-08-01T18:00:00"),
      }),
    ).toBe(true);
    expect(readMissionCompletion()?.dateKey).toBe("2026-08-01");
  });

  it("does not count other guest or other day", () => {
    markMissionCompleted({
      guestId: "guest-1",
      missionId: "speech_preschool_name_it",
      now: new Date("2026-08-01T10:00:00"),
    });
    expect(
      isMissionCompletedToday({
        guestId: "guest-2",
        missionId: "speech_preschool_name_it",
        now: new Date("2026-08-01T10:00:00"),
      }),
    ).toBe(false);
    expect(
      isMissionCompletedToday({
        guestId: "guest-1",
        missionId: "speech_preschool_name_it",
        now: new Date("2026-08-02T10:00:00"),
      }),
    ).toBe(false);
  });

  it("localDateKey is YYYY-MM-DD", () => {
    expect(localDateKey(new Date("2026-08-01T22:15:00"))).toBe("2026-08-01");
  });
});

describe("Guest state → mission", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearMissionCompletion();
  });

  it("uses guest age + worry + name for mission", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestAgeBand("infant_0_12m");
    setGuestChildName("Mina");
    setGuestWorry("sleep");
    const session = getGuestSession();
    const mission = getTodaySpeechMission(session);
    expect(mission.missionId).toBe("speech_infant_soft_voice");
    expect(mission.worry).toBe("sleep");
    expect(mission.title).toContain("Mina");
    expect(mission.duration).toBe("2 min");
    expect(mission.difficulty).toBe("easy");
    expect(mission.estimatedMinutes).toBe(2);
  });
});
