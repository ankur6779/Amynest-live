import { describe, expect, it } from "vitest";
import {
  BIRTH_SKY_KILL_SWITCH_PROBE_PATHS,
  normalizeBirthSkyPath,
  resolveBirthSkyEntry,
} from "./entry-resolver";

const base = {
  deepLinksEnabled: true,
  hasCommittedProfile: false,
  hasSnapshot: false,
  revealCompleted: false,
  isDeepLink: false,
};

describe("resolveBirthSkyEntry", () => {
  it("kill switch: every entry path resolves unavailable when flag off", () => {
    for (const path of BIRTH_SKY_KILL_SWITCH_PROBE_PATHS) {
      const r = resolveBirthSkyEntry({
        ...base,
        path,
        enabled: false,
        isDeepLink: path.includes("reveal") || path.includes("formation"),
      });
      expect(r, path).toEqual({ land: "unavailable", reason: "flag_off" });
    }
  });

  it("lands dashboard sky when profile+snapshot+reveal done", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/app",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "dashboard", segment: "sky" });
  });

  it("lands dashboard astronomy deep link", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/app/astronomy",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "dashboard", segment: "astronomy" });
  });

  it("IM-3: tradition deep link lands on tradition", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/app/tradition",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "dashboard", segment: "tradition" });
  });

  it("IM-3: reflect deep link lands on reflect", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/app/reflect",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "dashboard", segment: "reflect" });
  });

  it("IM-5: settings lands when profile committed", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/settings",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "settings", subpage: "root" });
  });

  it("IM-5: privacy lands when profile committed", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/privacy",
      enabled: true,
      hasCommittedProfile: true,
      hasSnapshot: true,
      revealCompleted: true,
    });
    expect(r).toEqual({ land: "privacy" });
  });

  it("IM-5: settings without profile redirects to welcome", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/settings",
      enabled: true,
      hasCommittedProfile: false,
    });
    expect(r).toEqual({
      land: "redirect",
      to: "/birth-sky/welcome",
      reason: "settings_needs_profile",
    });
  });

  it("blocks formation/reveal deep links without in-session allow", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/formation",
      enabled: true,
      isDeepLink: true,
    });
    expect(r.land).toBe("redirect");
  });

  it("aliases /birth-sky/dashboard → /birth-sky/app", () => {
    expect(normalizeBirthSkyPath("/birth-sky/dashboard")).toBe("/birth-sky/app");
  });

  it("lands setup date for date step", () => {
    const r = resolveBirthSkyEntry({
      ...base,
      path: "/birth-sky/setup/date?x=1",
      enabled: true,
    });
    expect(r).toEqual({ land: "setup", step: "date" });
  });
});
