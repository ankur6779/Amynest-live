import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPreferences,
  patchPreferencesLocal,
  savePreferences,
} from "./settings-store";

describe("settings-store Pack 7", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults skySounds off and showTradition on", () => {
    const p = loadPreferences("u1");
    expect(p.skySounds).toBe(false);
    expect(p.showTradition).toBe(true);
  });

  it("preserves updatedAt on save for LWW", () => {
    const stamped = {
      showTradition: false,
      skySounds: true,
      monthlyNotesOptIn: true,
      updatedAt: "2020-01-01T00:00:00.000Z",
    };
    savePreferences("u1", stamped);
    expect(loadPreferences("u1").updatedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("patchPreferencesLocal bumps updatedAt", () => {
    savePreferences("u1", {
      showTradition: true,
      skySounds: false,
      monthlyNotesOptIn: true,
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    const next = patchPreferencesLocal("u1", { skySounds: true });
    expect(next.skySounds).toBe(true);
    expect(next.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });
});
