import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AMYNEST_LIVING_SURFACE_FLAGS,
  readAmynestLivingUniverseSnapshot,
  resolveAmynestLivingUniverseMode,
  resolvePortfolioLivingFlag,
} from "./amynest-living-universe";

describe("FA-02 amynest living universe lock", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("inventories the full portfolio living surface set", () => {
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_HEALTH_LAB_LIVING_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_GROW_LIVING_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_BIRTH_SKY_LIVING_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_SPEECH_COACH_LIVING_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_ROUTINE_LIVING_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_TODAY_HOME_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toContain("VITE_FF_PARENT_HUB_ROOMS_V1");
    expect(AMYNEST_LIVING_SURFACE_FLAGS).toHaveLength(16);
  });

  it("test runtime defaults to mixed so per-module kill switches still work", () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "");
    expect(resolveAmynestLivingUniverseMode()).toBe("mixed");
    expect(resolvePortfolioLivingFlag("0")).toBe(false);
    expect(resolvePortfolioLivingFlag("")).toBe(true);
  });

  it("living master forces all surfaces ON even when a module flag is OFF", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "living");
    vi.stubEnv("VITE_FF_GROW_LIVING_V1", "0");
    vi.stubEnv("VITE_FF_HEALTH_LAB_LIVING_V1", "0");
    const { resolvePortfolioLivingFlag: resolve, readAmynestLivingUniverseSnapshot: snap } =
      await import("./amynest-living-universe");
    expect(resolve("0")).toBe(true);
    expect(snap().coherent).toBe(true);
    expect(Object.values(snap().surfaces).every(Boolean)).toBe(true);
  });

  it("legacy master forces all surfaces OFF even when a module flag is ON", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "legacy");
    vi.stubEnv("VITE_FF_GROW_LIVING_V1", "1");
    const { resolvePortfolioLivingFlag: resolve, readAmynestLivingUniverseSnapshot: snap } =
      await import("./amynest-living-universe");
    expect(resolve("1")).toBe(false);
    expect(snap().coherent).toBe(true);
    expect(Object.values(snap().surfaces).every((v) => v === false)).toBe(true);
  });

  it("mixed mode allows incoherent per-module combinations (dev/test only)", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "mixed");
    vi.stubEnv("VITE_FF_GROW_LIVING_V1", "0");
    vi.stubEnv("VITE_FF_HEALTH_LAB_LIVING_V1", "1");
    const { isGrowLivingV1Enabled } = await import("./grow/living-room");
    const { isHealthLabLivingV1Enabled } = await import("./health-lab/living-room");
    expect(isGrowLivingV1Enabled()).toBe(false);
    expect(isHealthLabLivingV1Enabled()).toBe(true);
    const snap = readAmynestLivingUniverseSnapshot();
    // Re-read after stubs via dynamic import path for grow/health already covered;
    // snapshot uses import.meta.env which vi.stubEnv updates.
    expect(snap.mode).toBe("mixed");
  });

  it("wired module helpers honor living master lock", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "1");
    vi.stubEnv("VITE_FF_SPEECH_COACH_LIVING_V1", "0");
    vi.stubEnv("VITE_FF_BIRTH_SKY_LIVING_V1", "0");
    vi.stubEnv("VITE_FF_PARENT_HUB_ROOMS_V1", "0");
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "0");
    const { isSpeechCoachLivingV1Enabled } = await import("./speech-coach/living-room");
    const { isBirthSkyLivingV1Enabled } = await import("./birth-sky/living-room");
    const { isParentHubRoomsV1Enabled } = await import("./parent-hub/feature-flags");
    const { isTodayHomeV1Enabled } = await import("./today-home/feature-flags");
    expect(isSpeechCoachLivingV1Enabled()).toBe(true);
    expect(isBirthSkyLivingV1Enabled()).toBe(true);
    expect(isParentHubRoomsV1Enabled()).toBe(true);
    expect(isTodayHomeV1Enabled()).toBe(true);
  });

  it("wired module helpers honor legacy master lock", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "0");
    vi.stubEnv("VITE_FF_SPEECH_COACH_LIVING_V1", "1");
    vi.stubEnv("VITE_FF_ROUTINE_LIVING_V1", "true");
    const { isSpeechCoachLivingV1Enabled } = await import("./speech-coach/living-room");
    const { isRoutineLivingV1Enabled } = await import("./routine-generation/living-entry");
    expect(isSpeechCoachLivingV1Enabled()).toBe(false);
    expect(isRoutineLivingV1Enabled()).toBe(false);
  });
});
