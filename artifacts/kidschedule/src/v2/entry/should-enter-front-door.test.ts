import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  isNewFrontDoorEnabled,
  shouldEnterFrontDoor,
} from "./should-enter-front-door";

describe("shouldEnterFrontDoor (S1-T06)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults off — production path", () => {
    expect(isNewFrontDoorEnabled()).toBe(false);
    expect(shouldEnterFrontDoor()).toBe(false);
  });

  it("requires both new_front_door and guest_mode_v2", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("new_front_door"), "1");
    expect(shouldEnterFrontDoor()).toBe(false);

    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    expect(shouldEnterFrontDoor()).toBe(true);
  });
});
