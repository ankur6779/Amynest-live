import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  isAskAmyV2Enabled,
  isForChildV2Enabled,
  isTodayV2Enabled,
  isV2ShellTabRoute,
  shouldLandOnTodayHome,
  shouldUseV2Navigation,
} from "./v2-shell-flags";

describe("V2 shell flags (Sprint 2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults all shell flags off", () => {
    expect(isTodayV2Enabled()).toBe(false);
    expect(isAskAmyV2Enabled()).toBe(false);
    expect(isForChildV2Enabled()).toBe(false);
    expect(shouldUseV2Navigation()).toBe(false);
    expect(shouldLandOnTodayHome()).toBe(false);
  });

  it("lands on Today only when today_v2 and new_navigation are on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
    expect(shouldLandOnTodayHome()).toBe(false);
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    expect(shouldLandOnTodayHome()).toBe(true);
  });

  it("recognizes V2 tab routes", () => {
    expect(isV2ShellTabRoute("/today")).toBe(true);
    expect(isV2ShellTabRoute("/ask-amy")).toBe(true);
    expect(isV2ShellTabRoute("/for-child")).toBe(true);
    expect(isV2ShellTabRoute("/dashboard")).toBe(false);
  });
});
