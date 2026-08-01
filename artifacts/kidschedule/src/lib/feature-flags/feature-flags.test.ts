import { afterEach, describe, expect, it, vi } from "vitest";
import {
  V2_BOOLEAN_FLAG_DEFAULTS,
  V2_BOOLEAN_FLAG_KEYS,
  V2_ROLLOUT_COHORT_ENV_KEY,
  V2_WEDGE_ID_ENV_KEY,
  areAllV2BooleanFlagsAtDefaultOff,
  createDefaultV2FlagSnapshot,
  getV2FlagSnapshot,
  getV2RolloutCohortPercent,
  getV2WedgeId,
  isV2FlagEnabled,
  listV2BooleanFlagEnvKeys,
  parseBooleanEnv,
  parseCohortPercent,
  parseWedgeId,
  v2BooleanFlagEnvKey,
} from "./index";

describe("V2 feature flags (S0-T01)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes every Phase-11 boolean flag key", () => {
    expect(V2_BOOLEAN_FLAG_KEYS).toEqual([
      "new_front_door",
      "guest_mode_v2",
      "today_v2",
      "mission_engine_v2",
      "ask_amy_v2",
      "for_child_v2",
      "speech_hero",
      "new_navigation",
      "migration_mode",
      "legacy_hidden",
      "legacy_onboarding_bridge",
      "deprecate_explore_free",
      "progressive_reveal",
      "premium_v2",
      "analytics_v2_core",
    ]);
  });

  it("defaults every boolean flag to false (prod-safe)", () => {
    for (const key of V2_BOOLEAN_FLAG_KEYS) {
      expect(V2_BOOLEAN_FLAG_DEFAULTS[key]).toBe(false);
    }
    const snapshot = createDefaultV2FlagSnapshot();
    expect(areAllV2BooleanFlagsAtDefaultOff(snapshot)).toBe(true);
    expect(snapshot.v2_rollout_cohort).toBe(0);
    expect(snapshot.v2_wedge_id).toBe("speech");
  });

  it("reads false when env unset", () => {
    for (const key of V2_BOOLEAN_FLAG_KEYS) {
      vi.stubEnv(v2BooleanFlagEnvKey(key), "");
      expect(isV2FlagEnabled(key)).toBe(false);
    }
    expect(areAllV2BooleanFlagsAtDefaultOff()).toBe(true);
  });

  it("enables a single flag independently via env", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("new_front_door"), "1");
    expect(isV2FlagEnabled("new_front_door")).toBe(true);
    expect(isV2FlagEnabled("today_v2")).toBe(false);
    expect(isV2FlagEnabled("premium_v2")).toBe(false);
  });

  it("parses boolean env values", () => {
    expect(parseBooleanEnv(undefined, false)).toBe(false);
    expect(parseBooleanEnv("1", false)).toBe(true);
    expect(parseBooleanEnv("true", false)).toBe(true);
    expect(parseBooleanEnv("0", true)).toBe(false);
    expect(parseBooleanEnv("nope", false)).toBe(false);
  });

  it("reads rollout cohort percent with clamp", () => {
    expect(parseCohortPercent(undefined, 0)).toBe(0);
    expect(parseCohortPercent("25", 0)).toBe(25);
    expect(parseCohortPercent("150", 0)).toBe(100);
    expect(parseCohortPercent("-3", 0)).toBe(0);
    vi.stubEnv(V2_ROLLOUT_COHORT_ENV_KEY, "40");
    expect(getV2RolloutCohortPercent()).toBe(40);
  });

  it("reads wedge id with speech default", () => {
    expect(parseWedgeId(undefined, "speech")).toBe("speech");
    expect(parseWedgeId("speech", "speech")).toBe("speech");
    expect(parseWedgeId("unknown", "speech")).toBe("speech");
    vi.stubEnv(V2_WEDGE_ID_ENV_KEY, "");
    expect(getV2WedgeId()).toBe("speech");
  });

  it("snapshot and env key list stay complete", () => {
    const snapshot = getV2FlagSnapshot();
    for (const key of V2_BOOLEAN_FLAG_KEYS) {
      expect(typeof snapshot[key]).toBe("boolean");
    }
    expect(listV2BooleanFlagEnvKeys()).toHaveLength(V2_BOOLEAN_FLAG_KEYS.length);
    expect(listV2BooleanFlagEnvKeys()[0]).toBe("VITE_V2_FF_NEW_FRONT_DOOR");
  });
});
