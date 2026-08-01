import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { FrontDoorState } from "@/v2/front-door/state-machine";
import {
  V2_GUEST_SESSION_VERSION,
  V2_GUEST_STORAGE_KEY,
  clearGuestSession,
  ensureGuestSession,
  getGuestSession,
  isGuestModeV2Enabled,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
} from "./index";

describe("V2 Guest Mode (S1-T01 + review P0 version)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
  });

  it("is disabled by default and does not persist", () => {
    expect(isGuestModeV2Enabled()).toBe(false);
    expect(ensureGuestSession()).toBeNull();
    expect(getGuestSession()).toBeNull();
  });

  it("persists versioned session with name/worry/state", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    const session = ensureGuestSession();
    expect(session?.version).toBe(V2_GUEST_SESSION_VERSION);
    expect(session?.state).toBe(FrontDoorState.BREATH);

    setGuestAgeBand("preschool_3_5");
    setGuestChildName("Aarav");
    setGuestWorry("speech_talking");

    const next = getGuestSession();
    expect(next?.version).toBe(1);
    expect(next?.ageBand).toBe("preschool_3_5");
    expect(next?.name).toBe("Aarav");
    expect(next?.worry).toBe("speech_talking");
    expect(next?.state).toBe(FrontDoorState.COMPLETE);

    const raw = JSON.parse(localStorage.getItem(V2_GUEST_STORAGE_KEY) ?? "{}");
    expect(raw).toMatchObject({
      version: 1,
      ageBand: "preschool_3_5",
      name: "Aarav",
      worry: "speech_talking",
      state: "COMPLETE",
    });
  });

  it("allows skipping name (null)", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("  ");
    expect(getGuestSession()?.name).toBeNull();
    expect(getGuestSession()?.state).toBe(FrontDoorState.WORRY);
  });

  it("migrates legacy childName/worryId blob into versioned shape", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    localStorage.setItem(
      "amynest.v2.guest.session.v1",
      JSON.stringify({
        guestId: "legacy-guest",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ageBand: "toddler_1_2",
        childName: "Riya",
        worryId: "sleep",
        frontDoorStep: "worry",
        foundationComplete: true,
      }),
    );

    const session = getGuestSession();
    expect(session?.version).toBe(1);
    expect(session?.name).toBe("Riya");
    expect(session?.worry).toBe("sleep");
    expect(session?.state).toBe(FrontDoorState.COMPLETE);
    expect(localStorage.getItem("amynest.v2.guest.session.v1")).toBeNull();
  });

  it("clearGuestSession removes local data only", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    clearGuestSession();
    expect(getGuestSession()).toBeNull();
  });
});
