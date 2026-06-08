import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SECRET_TRIGGER_CHANCE,
  activateSecretMode,
  clearActiveSecretMode,
  getActiveSecretModeId,
  tryTriggerSecretMode,
} from "./talking-amy-secrets";

describe("talking-amy-secrets", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearActiveSecretMode();
  });

  it("does not trigger below chance threshold", () => {
    expect(tryTriggerSecretMode(SECRET_TRIGGER_CHANCE)).toBeNull();
  });

  it("activates a secret mode for five minutes", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const id = tryTriggerSecretMode(0);
    expect(id).toBeTruthy();
    expect(getActiveSecretModeId(now)).toBe(id);
    activateSecretMode("galaxy", now);
    expect(getActiveSecretModeId(now)).toBe("galaxy");
    vi.restoreAllMocks();
  });
});
