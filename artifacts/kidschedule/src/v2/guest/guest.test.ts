import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { FrontDoorState } from "@/v2/front-door/state-machine";
import { AMY_MEMORY_STORAGE_KEY } from "@/v2/amy-memory";
import {
  V2_GUEST_SESSION_VERSION,
  buildPremiumAccountRequiredMessage,
  buildSignupContinuitySubline,
  clearGuestSession,
  clearSoftSaveForTests,
  ensureGuestSession,
  getGuestSession,
  isGuestModeV2Enabled,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
  setPostAuthReturnPath,
  tryResolveV2PostAuthPath,
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

    const raw = JSON.parse(localStorage.getItem(AMY_MEMORY_STORAGE_KEY) ?? "{}");
    expect(raw).toMatchObject({
      schemaVersion: 2,
      child: {
        ageBand: "preschool_3_5",
        displayName: "Aarav",
        meta: { source: "guest_bridge" },
      },
      challenge: { worryId: "speech_talking" },
      frontDoor: { state: "COMPLETE" },
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

describe("Stay With Amy — continuity copy (presentation)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearSoftSaveForTests();
  });

  it("premium account message honors name + concern, never billing", () => {
    const msg = buildPremiumAccountRequiredMessage({
      name: "Aarav",
      worry: "sleep",
    });
    expect(msg).toMatch(/Aarav/);
    expect(msg).toMatch(/Sleep/);
    expect(msg.toLowerCase()).toMatch(/permission for amy|relationship/);
    expect(msg.toLowerCase()).not.toMatch(
      /subscription|billing|checkout|create your account|upgrade|₹|pricing|money/,
    );
  });

  it("signup continuity subline uses soft-save return + concern", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("Riya");
    setGuestWorry("behavior");
    setPostAuthReturnPath("/premium");
    const line = buildSignupContinuitySubline(getGuestSession());
    expect(line).toMatch(/Riya/);
    expect(line).toMatch(/Behavior/i);
    expect(line?.toLowerCase()).not.toMatch(/subscription|billing/);
  });
});

describe("soft-save return paths (trust continuity)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearSoftSaveForTests();
  });

  it("resolves /ask-amy and /for-child post-auth returns", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
    ensureGuestSession();
    setGuestWorry("sleep");

    setPostAuthReturnPath("/ask-amy");
    expect(tryResolveV2PostAuthPath()).toBe("/ask-amy");

    setPostAuthReturnPath("/for-child");
    expect(tryResolveV2PostAuthPath()).toBe("/for-child");
  });
});
