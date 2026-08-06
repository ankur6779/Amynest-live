import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  isGuestV2AskAmyAccessAllowed,
  isGuestV2ForChildAccessAllowed,
  isGuestV2PremiumAccessAllowed,
  isGuestV2TodayAccessAllowed,
} from "./guest-access";

describe("guest-access (trust-first shells)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults OFF", () => {
    expect(isGuestV2TodayAccessAllowed()).toBe(false);
    expect(isGuestV2AskAmyAccessAllowed()).toBe(false);
    expect(isGuestV2ForChildAccessAllowed()).toBe(false);
    expect(isGuestV2PremiumAccessAllowed()).toBe(false);
  });

  it("Ask Amy + For Child allowed when guest + shell flags on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    vi.stubEnv(v2BooleanFlagEnvKey("ask_amy_v2"), "1");
    vi.stubEnv(v2BooleanFlagEnvKey("for_child_v2"), "1");
    expect(isGuestV2AskAmyAccessAllowed()).toBe(true);
    expect(isGuestV2ForChildAccessAllowed()).toBe(true);
  });
});
