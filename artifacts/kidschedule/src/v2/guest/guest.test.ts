import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
  getGuestSession,
  isGuestModeV2Enabled,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
} from "./index";

describe("V2 Guest Mode (S1-T01)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
  });

  it("is disabled by default and does not persist", () => {
    expect(isGuestModeV2Enabled()).toBe(false);
    expect(ensureGuestSession()).toBeNull();
    expect(getGuestSession()).toBeNull();
  });

  it("creates and persists a guest session when guest_mode_v2 is on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    const session = ensureGuestSession();
    expect(session?.guestId).toBeTruthy();
    expect(getGuestSession()?.guestId).toBe(session!.guestId);

    setGuestAgeBand("preschool_3_5");
    setGuestChildName("Aarav");
    setGuestWorry("speech_talking");

    const next = getGuestSession();
    expect(next?.ageBand).toBe("preschool_3_5");
    expect(next?.childName).toBe("Aarav");
    expect(next?.worryId).toBe("speech_talking");
    expect(next?.foundationComplete).toBe(true);
  });

  it("allows skipping name (null)", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("  ");
    expect(getGuestSession()?.childName).toBeNull();
  });

  it("clearGuestSession removes local data only", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    clearGuestSession();
    expect(getGuestSession()).toBeNull();
  });
});
